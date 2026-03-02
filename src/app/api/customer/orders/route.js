import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';

export async function GET(request) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[OrdersAPI:${requestId}] Start`);

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 5; // Reduced to 5 per page
    const skip = (page - 1) * limit;

    const dbStart = Date.now();
    await connectDB();
    console.log(`[OrdersAPI:${requestId}] DB Connected in ${Date.now() - dbStart}ms`);

    let query = { 
      customerId: decoded.userId,
      isMasterOrder: true,
    };

    if (status && status !== 'ALL') {
      query.orderStatus = status;
    }

    const queryStart = Date.now();
    const [orders, total] = await Promise.all([
      Order.find(query)
        .select({
          orderNumber: 1,
          orderStatus: 1,
          total: 1,
          createdAt: 1,
          'items.name': 1,
          'items.image': 1,
          'items.price': 1,
          'items.quantity': 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);
    console.log(`[OrdersAPI:${requestId}] Query done in ${Date.now() - queryStart}ms. Items: ${orders.length}, Total: ${total}`);

    const resBody = {
      success: true,
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: orders.length,
    };

    const end = Date.now();
    console.log(`[OrdersAPI:${requestId}] Request total time: ${end - start}ms`);
    return NextResponse.json(resBody);
  } catch (error) {
    console.error(`[OrdersAPI:${requestId}] Error:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}