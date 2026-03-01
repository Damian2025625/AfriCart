import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';

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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { orderNumber } = await params;
    const { reason, message } = await request.json();

    if (!reason || !message) {
      return NextResponse.json(
        { success: false, message: 'Reason and message are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the master order
    const order = await Order.findOne({
      orderNumber,
      customerId: decoded.userId,
      isMasterOrder: true,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow disputing orders that are DELIVERED (typical case) 
    // or maybe SHIPPED if it's taking too long. 
    // For now, let's allow it for anything that isn't CANCELLED.
    if (order.orderStatus === 'CANCELLED') {
      return NextResponse.json(
        { success: false, message: 'Cannot dispute a cancelled order' },
        { status: 400 }
      );
    }

    if (order.dispute.isDisputed) {
      return NextResponse.json(
        { success: false, message: 'This order is already under dispute' },
        { status: 400 }
      );
    }

    // Update dispute info
    order.dispute.isDisputed = true;
    order.dispute.reason = reason;
    order.dispute.customerMessage = message;
    order.dispute.status = 'PENDING';
    order.dispute.createdAt = new Date();

    await order.save();

    // Also update sub-orders so vendors/admin see it there too if needed
    // In this app, the Admin dashboard often fetches based on the master order being disputed
    // but the sub-orders might need referencing. 
    // The admin dispute route I saw earlier (src/app/api/admin/disputes/route.js:27)
    // filter by Order.find({ 'dispute.isDisputed': true })
    
    await Order.updateMany(
      { masterOrderId: order._id },
      { 
        $set: { 
          'dispute.isDisputed': true,
          'dispute.reason': reason,
          'dispute.customerMessage': message,
          'dispute.status': 'PENDING',
          'dispute.createdAt': new Date(),
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Dispute submitted successfully. Our team will review it.',
      order
    });
  } catch (error) {
    console.error('Submit dispute error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit dispute' },
      { status: 500 }
    );
  }
}
