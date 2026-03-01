import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import Review from '@/lib/mongodb/models/Review';

export async function GET(request, { params }) {
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

    const { orderNumber } = await params;

    await connectDB();

    // Find master order and populate sub-orders with vendor AND user info
    const order = await Order.findOne({
      orderNumber,
      customerId: decoded.userId,
      isMasterOrder: true,
    }).populate({
      path: 'subOrders',
      populate: {
        path: 'vendorId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email phone'
        }
      }
    }).lean(); // ✅ Convert to plain JavaScript object

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // ✅ Calculate vendor ratings for each sub-order
    for (const subOrder of order.subOrders) {
      if (subOrder.vendorId) {
        const vendorId = subOrder.vendorId._id;
        
        // Get all reviews for this vendor's products
        const vendorReviews = await Review.aggregate([
          {
            $lookup: {
              from: 'products',
              localField: 'productId',
              foreignField: '_id',
              as: 'product'
            }
          },
          {
            $unwind: '$product'
          },
          {
            $match: {
              'product.vendorId': vendorId
            }
          },
          {
            $group: {
              _id: null,
              avgRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 }
            }
          }
        ]);

        // ✅ Add calculated rating to vendor object (now it's a plain object)
        if (vendorReviews.length > 0) {
          subOrder.vendorId.calculatedRating = vendorReviews[0].avgRating;
          subOrder.vendorId.calculatedTotalReviews = vendorReviews[0].totalReviews;
        } else {
          subOrder.vendorId.calculatedRating = 0;
          subOrder.vendorId.calculatedTotalReviews = 0;
        }

        console.log(`✅ Vendor ${subOrder.vendorId.businessName}: ${subOrder.vendorId.calculatedRating} (${subOrder.vendorId.calculatedTotalReviews} reviews)`);
      }
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
