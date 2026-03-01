import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Wishlist from '@/lib/mongodb/models/Wishlist';
import Product from '@/lib/mongodb/models/Product';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }

    await connectDB();

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    // Check if already in wishlist
    const existingItem = await Wishlist.findOne({
      customerId: decoded.userId,
      productId: productId,
    });

    if (existingItem) {
      return NextResponse.json({ 
        success: false, 
        message: 'Product already in wishlist',
        alreadyExists: true 
      }, { status: 400 });
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({
      customerId: decoded.userId,
      productId: productId,
    });

    return NextResponse.json({
      success: true,
      message: 'Product added to wishlist',
      wishlistItem,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}