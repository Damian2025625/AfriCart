import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Review from '@/lib/mongodb/models/Review';
import Customer from '@/lib/mongodb/models/Customer';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// PUT - Edit existing review
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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Only customers can edit reviews' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id: productId, reviewId } = await params;
    const body = await request.json();
    const { rating, comment } = body;

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

    // Find the review and verify ownership
    const review = await Review.findOne({
      _id: reviewId,
      productId,
      customerId: customer._id,
    });

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // Update the review
    review.rating = parseInt(rating);
    review.comment = comment.trim();
    await review.save();

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
      message: 'Review updated successfully',
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
    console.error('Edit review error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a review
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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Only customers can delete reviews' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id: productId, reviewId } = await params;

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Find and delete the review
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      productId,
      customerId: customer._id,
    });

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}