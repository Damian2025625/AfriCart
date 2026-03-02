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

    // 4. Optimize detail fetching
    const order = await Order.findOne({
      orderNumber,
      customerId: decoded.userId,
      isMasterOrder: true,
    }).populate({
      path: 'subOrders',
      select: 'orderNumber orderStatus items total createdAt vendorId shippingDetails', // Limited fields
      populate: {
        path: 'vendorId',
        select: 'businessName city state logoUrl',
        populate: {
          path: 'userId',
          select: 'firstName lastName email phone'
        }
      }
    }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // 5. Batch fetch vendor ratings (MUCH faster than a loop)
    const vendorIds = order.subOrders
      .filter(so => so.vendorId)
      .map(so => so.vendorId._id);

    if (vendorIds.length > 0) {
      const vendorRatings = await Review.aggregate([
        { 
          $lookup: { 
            from: 'products', 
            localField: 'productId', 
            foreignField: '_id', 
            as: 'product' 
          } 
        },
        { $unwind: '$product' },
        { $match: { 'product.vendorId': { $in: vendorIds } } },
        {
          $group: {
            _id: '$product.vendorId',
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      const ratingMap = Object.fromEntries(vendorRatings.map(r => [r._id.toString(), r]));

      for (const subOrder of order.subOrders) {
        if (subOrder.vendorId) {
          const stats = ratingMap[subOrder.vendorId._id.toString()];
          subOrder.vendorId.calculatedRating = stats?.avgRating || 0;
          subOrder.vendorId.calculatedTotalReviews = stats?.totalReviews || 0;
        }
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
