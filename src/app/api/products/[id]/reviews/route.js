import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Review from '@/lib/mongodb/models/Review';
import Customer from '@/lib/mongodb/models/Customer';
import Product from '@/lib/mongodb/models/Product';
import User from '@/lib/mongodb/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// GET - Fetch all reviews for a product
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id: productId } = await params;

    const reviews = await Review.find({ productId })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName',
        },
      })
      .sort({ createdAt: -1 });

    const transformedReviews = reviews.map(review => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      customer: review.customerId?.userId ? {
        firstName: review.customerId.userId.firstName,
        lastName: review.customerId.userId.lastName,
      } : null,
      customerId: review.customerId?._id?.toString(), // ✅ Added for edit check
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount || 0,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt, // ✅ Added to show when edited
    }));

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Submit a review
export async function POST(request, { params }) {
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
        { success: false, message: 'Only customers can leave reviews' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id: productId } = await params;
    const body = await request.json();
    const { rating, comment, orderId } = body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'Review comment must be at least 10 characters' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Check if customer already reviewed this product
    const existingReview = await Review.findOne({
      productId,
      customerId: customer._id,
    });

    if (existingReview) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'You have already reviewed this product',
          canEdit: true,
          reviewId: existingReview._id.toString()
        },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Create review
    const review = await Review.create({
      productId,
      customerId: customer._id,
      orderId: orderId || null,
      rating: parseInt(rating),
      comment: comment.trim(),
      isVerifiedPurchase: !!orderId,
    });

    // Populate customer info for response
    const populatedReview = await Review.findById(review._id)
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName',
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        _id: populatedReview._id.toString(),
        rating: populatedReview.rating,
        comment: populatedReview.comment,
        customer: populatedReview.customerId?.userId ? {
          firstName: populatedReview.customerId.userId.firstName,
          lastName: populatedReview.customerId.userId.lastName,
        } : null,
        customerId: populatedReview.customerId._id.toString(),
        isVerifiedPurchase: populatedReview.isVerifiedPurchase,
        createdAt: populatedReview.createdAt,
        updatedAt: populatedReview.updatedAt,
      },
    });
  } catch (error) {
    console.error('Submit review error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'You have already reviewed this product',
          canEdit: true
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}