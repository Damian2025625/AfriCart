import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import PriceOffer from '@/lib/mongodb/models/PriceOffer';
import User from '@/lib/mongodb/models/User';
import Vendor from '@/lib/mongodb/models/Vendor';
import Product from '@/lib/mongodb/models/Product';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    // 1. Fetch Disputed Orders
    const disputedOrders = await Order.find({ 'dispute.isDisputed': true })
      .populate('customerId', 'firstName lastName email')
      .populate('vendorId', 'businessName email')
      .sort({ updatedAt: -1 });

    // 2. Fetch Price Offers (Negotiations)
    const recentOffers = await PriceOffer.find()
      .populate('customerId', 'firstName lastName')
      .populate('vendorId', 'businessName')
      .populate('productId', 'name images')
      .sort({ updatedAt: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      disputes: disputedOrders,
      offers: recentOffers
    });
  } catch (error) {
    console.error('Admin disputes API error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch dispute data' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { orderId, status, adminNote } = await request.json();

    await connectDB();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    order.dispute.status = status;
    order.dispute.adminNote = adminNote;
    if (status === 'RESOLVED' || status === 'REJECTED') {
      order.dispute.resolvedAt = new Date();
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: `Dispute ${status} successfully`
    });
  } catch (error) {
    console.error('Admin disputes PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update dispute' }, { status: 500 });
  }
}
