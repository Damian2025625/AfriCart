import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// DELETE - Delete product
export async function DELETE(request, { params }) {
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

    const { id } = await params;

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Find and delete product (ensure it belongs to this vendor)
    const product = await Product.findOneAndDelete({
      _id: id,
      vendorId: vendor._id,
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}

// PATCH - Update product status or other fields
export async function PATCH(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update product (ensure it belongs to this vendor)
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        vendorId: vendor._id,
      },
      body,
      { new: true }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

// PUT - Full product update
export async function PUT(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!body.categoryId) {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      );
    }

    if (!body.price || parseFloat(body.price) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid price is required' },
        { status: 400 }
      );
    }

    // Update product (ensure it belongs to this vendor)
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        vendorId: vendor._id,
      },
      {
        name: body.name.trim(),
        description: body.description || null,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        price: parseFloat(body.price),
        quantity: parseInt(body.quantity) || 0,
        lowStockThreshold: body.lowStockThreshold !== undefined ? parseInt(body.lowStockThreshold) : 5,
        sku: body.sku?.trim() || null,
        images: body.images || [],
        features: body.features || [],
        discountPercentage: parseFloat(body.discountPercentage) || 0,
        discountStartDate: body.discountStartDate || null,
        discountEndDate: body.discountEndDate || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      { new: true }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: product._id,
        name: product.name,
      },
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle duplicate SKU error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'SKU already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}