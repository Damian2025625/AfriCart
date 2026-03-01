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

    // Products
    const totalProducts = await Product.countDocuments({ vendorId: vendor._id });
    const currentProducts = await Product.countDocuments({ vendorId: vendor._id, createdAt: { $gte: thirtyDaysAgo } });
    const prevProducts = await Product.countDocuments({ vendorId: vendor._id, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const productsTrend = prevProducts > 0 ? Math.round(((currentProducts - prevProducts) / prevProducts) * 100) : (currentProducts > 0 ? 100 : 0);

    // Orders
    const totalOrders = await Order.countDocuments({ vendorId: vendor._id });
    const currentOrdersCount = await Order.countDocuments({ vendorId: vendor._id, createdAt: { $gte: thirtyDaysAgo } });
    const prevOrdersCount = await Order.countDocuments({ vendorId: vendor._id, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const ordersTrend = prevOrdersCount > 0 ? Math.round(((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100) : (currentOrdersCount > 0 ? 100 : 0);

    // Calculate revenue from completed orders
    const allOrders = await Order.find({
      vendorId: vendor._id,
      orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    }).select('total vendorSettlement createdAt');

    let totalRevenue = 0;
    let currentRevenue = 0;
    let prevRevenue = 0;

    allOrders.forEach(order => {
      // Use vendorSettlement amount if available, otherwise fallback to total
      const val = order.vendorSettlement?.amount || order.total || 0;
      totalRevenue += val;
      
      if (order.createdAt >= thirtyDaysAgo) {
        currentRevenue += val;
      } else if (order.createdAt >= sixtyDaysAgo && order.createdAt < thirtyDaysAgo) {
        prevRevenue += val;
      }
    });

    const revenueTrend = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

    // Get unique customers
    const uniqueCustomers = await Order.distinct('customerId', { vendorId: vendor._id });
    
    // Customers trend - a bit complex with distinct, simplifying approximation: customers in last 30d vs 30-60d
    const currentCustomers = await Order.distinct('customerId', { vendorId: vendor._id, createdAt: { $gte: thirtyDaysAgo } });
    const prevCustomers = await Order.distinct('customerId', { vendorId: vendor._id, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
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