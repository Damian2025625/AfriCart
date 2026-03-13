import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Wishlist from '@/lib/mongodb/models/Wishlist';

export async function GET(request) {
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

    await connectDB();

    const wishlistItems = await Wishlist.find({ customerId: decoded.userId })
      .populate({
        path: 'productId',
        select: 'name price images categoryId vendorId',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'vendorId', select: 'businessName city state logoUrl' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out items where product no longer exists
    const validItems = wishlistItems.filter(item => item.productId);

    return NextResponse.json({
      success: true,
      wishlist: validItems,
      count: validItems.length,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}