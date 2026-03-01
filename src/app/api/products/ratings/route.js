import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Review from '@/lib/mongodb/models/Review';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, message: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    // Fetch all reviews for these products
    const reviews = await Review.find({ 
      productId: { $in: productIds } 
    }).select('productId rating');

    // Calculate ratings
    const ratingsMap = {};

    reviews.forEach(review => {
      const productId = review.productId.toString();
      
      if (!ratingsMap[productId]) {
        ratingsMap[productId] = {
          total: 0,
          count: 0,
          average: 0,
        };
      }

      ratingsMap[productId].total += review.rating;
      ratingsMap[productId].count += 1;
    });

    // Calculate averages
    Object.keys(ratingsMap).forEach(productId => {
      ratingsMap[productId].average = 
        ratingsMap[productId].total / ratingsMap[productId].count;
    });

    return NextResponse.json({
      success: true,
      ratings: ratingsMap,
    });
  } catch (error) {
    console.error('Product ratings error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}