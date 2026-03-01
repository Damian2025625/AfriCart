import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import CustomProductPrice from '@/lib/mongodb/models/CustomProductPrice';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// GET - Fetch custom price
export async function GET(request) {
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');

    if (!productId || !customerId) {
      return NextResponse.json(
        { success: false, message: 'Product ID and Customer ID are required' },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const customPrice = await CustomProductPrice.findOne({
      productId,
      customerId,
      vendorId: vendor._id,
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
        _id: customPrice._id.toString(),
        customPrice: customPrice.customPrice,
        notes: customPrice.notes,
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

// POST - Create custom price
export async function POST(request) {
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { productId, customerId, customPrice, notes, expiresAt } = body;

    if (!productId || !customerId || !customPrice) {
      return NextResponse.json(
        { success: false, message: 'Product ID, Customer ID, and Custom Price are required' },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const newCustomPrice = await CustomProductPrice.create({
      productId,
      customerId,
      vendorId: vendor._id,
      customPrice: parseFloat(customPrice),
      notes: notes || null,
      expiresAt: expiresAt || null,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      customPrice: {
        _id: newCustomPrice._id.toString(),
        customPrice: newCustomPrice.customPrice,
        notes: newCustomPrice.notes,
        expiresAt: newCustomPrice.expiresAt,
      },
    });
  } catch (error) {
    console.error('Create custom price error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create custom price' },
      { status: 500 }
    );
  }
}

// PUT - Update custom price
export async function PUT(request) {
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { customPriceId, customPrice, notes, expiresAt } = body;

    if (!customPriceId || !customPrice) {
      return NextResponse.json(
        { success: false, message: 'Custom Price ID and new price are required' },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const updatedCustomPrice = await CustomProductPrice.findOneAndUpdate(
      {
        _id: customPriceId,
        vendorId: vendor._id,
      },
      {
        customPrice: parseFloat(customPrice),
        notes: notes || null,
        expiresAt: expiresAt || null,
      },
      { new: true }
    );

    if (!updatedCustomPrice) {
      return NextResponse.json(
        { success: false, message: 'Custom price not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customPrice: {
        _id: updatedCustomPrice._id.toString(),
        customPrice: updatedCustomPrice.customPrice,
        notes: updatedCustomPrice.notes,
        expiresAt: updatedCustomPrice.expiresAt,
      },
    });
  } catch (error) {
    console.error('Update custom price error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update custom price' },
      { status: 500 }
    );
  }
}