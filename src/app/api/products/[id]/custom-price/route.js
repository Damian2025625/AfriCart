import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import CustomProductPrice from '@/lib/mongodb/models/CustomProductPrice';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Customers only' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id: productId } = await params;

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json({
        success: true,
        customPrice: null,
      });
    }

    const customPrice = await CustomProductPrice.findOne({
      productId,
      customerId: customer._id,
      isActive: true,
    });

    if (!customPrice) {
      return NextResponse.json({
        success: true,
        customPrice: null,
      });
    }

    // Check if expired
    if (customPrice.expiresAt && new Date(customPrice.expiresAt) < new Date()) {
      return NextResponse.json({
        success: true,
        customPrice: null,
      });
    }

    return NextResponse.json({
      success: true,
      customPrice: {
        customPrice: customPrice.customPrice,
        expiresAt: customPrice.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get custom price error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch custom price' },
      { status: 500 }
    );
  }
}