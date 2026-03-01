import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import Vendor from '@/lib/mongodb/models/Vendor';
import Product from '@/lib/mongodb/models/Product';

// Helper function to calculate master order status based on sub-orders
async function updateMasterOrderStatus(masterOrderId) {
  try {
    // Get all sub-orders for this master order
    const subOrders = await Order.find({
      masterOrderId: masterOrderId,
      isMasterOrder: false,
    });

    if (subOrders.length === 0) return;

    // Count statuses
    const statusCounts = {
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    subOrders.forEach((order) => {
      statusCounts[order.orderStatus]++;
    });

    const totalOrders = subOrders.length;
    let masterStatus = 'PENDING';

    // ✅ Logic to determine master order status
    if (statusCounts.DELIVERED === totalOrders) {
      // All delivered
      masterStatus = 'DELIVERED';
    } else if (statusCounts.CANCELLED === totalOrders) {
      // All cancelled
      masterStatus = 'CANCELLED';
    } else if (statusCounts.SHIPPED > 0) {
      // At least one shipped
      masterStatus = 'SHIPPED';
    } else if (statusCounts.PROCESSING > 0) {
      // At least one processing
      masterStatus = 'PROCESSING';
    } else if (statusCounts.CONFIRMED > 0) {
      // At least one confirmed
      masterStatus = 'CONFIRMED';
    } else {
      // All pending
      masterStatus = 'PENDING';
    }

    // Update master order
    await Order.findByIdAndUpdate(masterOrderId, {
      orderStatus: masterStatus,
    });

    console.log(`✅ Updated master order status to: ${masterStatus}`);
    console.log(`   Sub-orders breakdown:`, statusCounts);
  } catch (error) {
    console.error('Error updating master order status:', error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { orderNumber } = await params;
    const { status, trackingNumber, estimatedDelivery, vendorNotes } = await request.json();

    await connectDB();

    // Get vendor
    const vendor = await Vendor.findOne({ userId: decoded.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const order = await Order.findOne({
      orderNumber,
      vendorId: vendor._id,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const previousStatus = order.orderStatus;

    // Update sub-order
    order.orderStatus = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
    if (vendorNotes) order.vendorNotes = vendorNotes;
    
    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();
    } else if (status === 'CANCELLED') {
      order.cancelledAt = new Date();
      if (!order.cancellationReason) {
        order.cancellationReason = vendorNotes || 'Vendor cancelled';
      }
    }

    // Handle stock changes based on cancellation
    if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
      // Restore stock
      const stockUpdates = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { quantity: item.quantity, totalSold: -item.quantity } },
        },
      }));
      if (stockUpdates.length > 0) {
        await Product.bulkWrite(stockUpdates);
        console.log(`✅ Restored stock for cancelled order ${orderNumber}`);
      }
    } else if (status !== 'CANCELLED' && previousStatus === 'CANCELLED') {
      // Deduct stock (if uncancelling)
      const stockUpdates = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { quantity: -item.quantity, totalSold: item.quantity } },
        },
      }));
      if (stockUpdates.length > 0) {
        await Product.bulkWrite(stockUpdates);
        console.log(`✅ Deducted stock for un-cancelled order ${orderNumber}`);
      }
    }

    await order.save();

    console.log(`✅ Updated sub-order ${orderNumber} to ${status}`);

    // ✅ UPDATE MASTER ORDER STATUS
    if (order.masterOrderId) {
      await updateMasterOrderStatus(order.masterOrderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update order status' },
      { status: 500 }
    );
  }
}