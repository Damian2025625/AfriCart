import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Wishlist from '@/lib/mongodb/models/Wishlist';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, inWishlist: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Product ID required' }, { status: 400 });
    }

    await connectDB();

    const wishlistItem = await Wishlist.findOne({
      customerId: decoded.userId,
      productId: productId,
    });

    return NextResponse.json({
      success: true,
      inWishlist: !!wishlistItem,
      wishlistId: wishlistItem?._id || null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, inWishlist: false });
  }
}