import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import Product from '@/lib/mongodb/models/Product';
import User from '@/lib/mongodb/models/User';
import Vendor from '@/lib/mongodb/models/Vendor';
import { sendEmail } from '@/lib/email/nodemailer';
import { sendSMS } from '@/lib/notifications';
import { createPaymentAdapter } from '@/lib/payment/adapter';

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
    const { reason } = await request.json();

    await connectDB();

    const customer = await User.findById(decoded.userId);

    // Find master order
    const masterOrder = await Order.findOne({
      orderNumber,
      customerId: decoded.userId,
      isMasterOrder: true,
    });

    if (!masterOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(masterOrder.orderStatus)) {
      return NextResponse.json(
        { success: false, message: 'Order cannot be cancelled at this stage' },
        { status: 400 }
      );
    }

    // ── Paystack Refund Logic ────────────────────────────────────────────────
    let refundSuccessful = false;
    let refundError = null;

    if (
      masterOrder.paymentStatus === 'PAID' &&
      ['PAYSTACK', 'CARD', 'BANK_TRANSFER_ONLINE'].includes(masterOrder.paymentMethod)
    ) {
      try {
        const transactionId = 
          masterOrder.paymentDetails?.transactionId || 
          masterOrder.vendorSettlement?.paystackTransactionId || 
          masterOrder.vendorSettlement?.transactionId;
        
        if (transactionId) {
          const paymentAdapter = createPaymentAdapter();
          const refundResult = await paymentAdapter.refundTransaction(
            transactionId,
            masterOrder.total
          );

          if (refundResult.success) {
            refundSuccessful = true;
            masterOrder.paymentStatus = 'REFUNDED';
            console.log(`💰 Refund initiated for ${orderNumber}: ${refundResult.refundId}`);
          }
        }
      } catch (err) {
        console.error('❌ Refund failed:', err.message);
        refundError = err.message;
        // We continue with cancellation but maybe log or alert admin
      }
    }

    // ✅ Cancel all sub-orders
    const subOrders = await Order.find({
      masterOrderId: masterOrder._id,
      isMasterOrder: false,
    });

    // 🔔 COLLECT VENDORS TO NOTIFY
    const vendorNotifications = [];

    for (const subOrder of subOrders) {
      // Restore stock for each item
      for (const item of subOrder.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 
            quantity: item.quantity,
            totalSold: -item.quantity 
          },
        });
      }

      // Cancel sub-order
      subOrder.orderStatus = 'CANCELLED';
      subOrder.cancelledAt = new Date();
      subOrder.cancellationReason = reason || 'Customer cancelled';
      if (refundSuccessful) subOrder.paymentStatus = 'REFUNDED';
      await subOrder.save();

      // 🔔 GET VENDOR INFO FOR NOTIFICATION
      const vendor = await Vendor.findById(subOrder.vendorId).populate('userId');
      
      if (vendor && vendor.userId) {
        vendorNotifications.push({
          vendor,
          vendorUser: vendor.userId,
          subOrder,
        });
      }
    }

    // ✅ Cancel master order
    masterOrder.orderStatus = 'CANCELLED';
    masterOrder.cancelledAt = new Date();
    masterOrder.cancellationReason = reason || 'Customer cancelled';
    await masterOrder.save();

    // 🔔 SEND CANCELLATION NOTIFICATIONS TO VENDORS (non-blocking)
    const notificationPromises = vendorNotifications.map(({ vendor, vendorUser, subOrder }) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      
      const sms = sendSMS(
        vendorUser.phone,
        `ORDER CANCELLED!\nOrder #${subOrder.orderNumber} cancelled by ${customerName}.\nReason: ${reason || 'Not provided'}\nStock restored.`
      ).catch(err => console.error('SMS error:', err));

      const email = sendEmail({
        to: vendorUser.email,
        subject: `Order Cancelled - ${subOrder.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1>❌ Order Cancelled</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p>Hello ${vendorUser.firstName},</p>
              <p>Order <strong>#${subOrder.orderNumber}</strong> has been cancelled by the customer.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
                <p><strong>Order Total:</strong> ₦${subOrder.total.toLocaleString()}</p>
              </div>
              <p>Inventory restored. ${refundSuccessful ? 'Refund has been initiated for the customer.' : ''}</p>
            </div>
          </div>
        `,
      }).catch(err => console.error('Email error:', err));

      return Promise.all([sms, email]);
    });

    Promise.all(notificationPromises).catch(err => console.error('Notification promise error:', err));

    return NextResponse.json({
      success: true,
      message: refundSuccessful 
        ? 'Order cancelled and refund initiated successfully' 
        : refundError 
          ? `Order cancelled but refund failed: ${refundError}` 
          : 'Order cancelled successfully',
      order: masterOrder,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}