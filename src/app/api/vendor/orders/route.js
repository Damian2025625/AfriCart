import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import Vendor from '@/lib/mongodb/models/Vendor';

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    await connectDB();

    // Get vendor
    const vendor = await Vendor.findOne({ userId: decoded.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    let query = { 
      vendorId: vendor._id,
      isMasterOrder: false, // ✅ Only show sub-orders to vendor (their products only)
    };

    // Filter by status if provided
    if (status && status !== 'ALL') {
      query.orderStatus = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .select({
          orderNumber: 1,
          orderStatus: 1,
          total: 1,
          createdAt: 1,
          customerId: 1,
          items: 1,
          shippingAddress: 1
        })
        .populate('customerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: orders.length,
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}