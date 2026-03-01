import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Order from '@/lib/mongodb/models/Order';
import Vendor from '@/lib/mongodb/models/Vendor';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
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

    await connectDB();

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // ✅ Get last 5 orders for this vendor (sub-orders only, not master orders)
    const orders = await Order.find({ 
      vendorId: vendor._id,
      isMasterOrder: false // Only get sub-orders that belong to this vendor
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'firstName lastName email') // Populate customer details
      .select('orderNumber orderStatus total createdAt customerId items subtotal deliveryFee');

    return NextResponse.json({
      success: true,
      orders: orders.map(order => {
        // ✅ Safely get customer name
        const customerName = order.customerId 
          ? `${order.customerId.firstName || ''} ${order.customerId.lastName || ''}`.trim()
          : 'Unknown Customer';

        // ✅ Calculate total items
        const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        return {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus, // ✅ Correct field name from your schema
          totalAmount: order.total, // ✅ Correct field name from your schema
          createdAt: order.createdAt,
          customerName: customerName,
          totalItems: totalItems,
        };
      }),
    });
  } catch (error) {
    console.error('Orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}