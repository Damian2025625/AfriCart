import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Address from '@/lib/mongodb/models/Address';

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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const addresses = await Address.find({ customerId: decoded.userId })
      .sort({ isDefault: -1, createdAt: -1 }); // Default first, then newest

    return NextResponse.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const addressData = await request.json();

    await connectDB();

    // If this is set as default, unset other defaults
    if (addressData.isDefault) {
      await Address.updateMany(
        { customerId: decoded.userId },
        { isDefault: false }
      );
    }

    const address = await Address.create({
      ...addressData,
      customerId: decoded.userId,
    });

    return NextResponse.json({
      success: true,
      address,
      message: 'Address saved successfully',
    });
  } catch (error) {
    console.error('Create address error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save address' },
      { status: 500 }
    );
  }
}