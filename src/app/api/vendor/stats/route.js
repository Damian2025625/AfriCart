import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Order from '@/lib/mongodb/models/Order';
import Vendor from '@/lib/mongodb/models/Vendor';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    // Get token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token
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

    // Find vendor by userId
    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Products counts
    const [totalProducts, currentProducts, prevProducts, totalOrders] = await Promise.all([
      Product.countDocuments({ vendorId: vendor._id }),
      Product.countDocuments({ vendorId: vendor._id, createdAt: { $gte: thirtyDaysAgo } }),
      Product.countDocuments({ vendorId: vendor._id, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Order.countDocuments({ vendorId: vendor._id })
    ]);

    const productsTrend = prevProducts > 0 ? Math.round(((currentProducts - prevProducts) / prevProducts) * 100) : (currentProducts > 0 ? 100 : 0);

    // Optimized Revenue and Orders calculation using aggregation
    const statsAggregation = await Order.aggregate([
      { 
        $match: { 
          vendorId: vendor._id,
          orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$vendorSettlement.amount", { $ifNull: ["$total", 0] }] } },
          currentRevenue: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, { $ifNull: ["$vendorSettlement.amount", "$total"] }, 0]
            }
          },
          prevRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$createdAt", sixtyDaysAgo] }, { $lt: ["$createdAt", thirtyDaysAgo] }] },
                { $ifNull: ["$vendorSettlement.amount", "$total"] },
                0
              ]
            }
          },
          currentOrdersCount: {
            $sum: { $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0] }
          },
          prevOrdersCount: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$createdAt", sixtyDaysAgo] }, { $lt: ["$createdAt", thirtyDaysAgo] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const statsResult = statsAggregation[0] || { 
      totalRevenue: 0, currentRevenue: 0, prevRevenue: 0, 
      currentOrdersCount: 0, prevOrdersCount: 0 
    };

    const { totalRevenue, currentRevenue, prevRevenue, currentOrdersCount, prevOrdersCount } = statsResult;

    const ordersTrend = prevOrdersCount > 0 ? Math.round(((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100) : (currentOrdersCount > 0 ? 100 : 0);
    const revenueTrend = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

    // Unique customers counts
    const [uniqueCustomers, currentCustomers, prevCustomers] = await Promise.all([
      Order.distinct('customerId', { vendorId: vendor._id }),
      Order.distinct('customerId', { vendorId: vendor._id, createdAt: { $gte: thirtyDaysAgo } }),
      Order.distinct('customerId', { vendorId: vendor._id, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
    ]);
    
    const cCurr = currentCustomers.length;
    const cPrev = prevCustomers.length;
    const customersTrend = cPrev > 0 ? Math.round(((cCurr - cPrev) / cPrev) * 100) : (cCurr > 0 ? 100 : 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue,
        totalCustomers: uniqueCustomers.length,
        trends: {
          products: productsTrend,
          orders: ordersTrend,
          revenue: revenueTrend,
          customers: customersTrend
        }
      },
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}