import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Cart from '@/lib/mongodb/models/Cart';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import CustomProductPrice from '@/lib/mongodb/models/CustomProductPrice';
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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Customers only' },
        { status: 403 }
      );
    }

    await connectDB();

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    const cart = await Cart.findOne({ customerId: customer._id })
      .populate({
        path: 'items.productId',
        populate: {
          path: 'vendorId',
          select: 'businessName city state',
        },
      });

    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // Get all product IDs from cart
    const productIds = cart.items
      .filter(item => item.productId)
      .map(item => item.productId._id);

    // Fetch all custom prices for this customer in one query
    const customPrices = await CustomProductPrice.find({
      productId: { $in: productIds },
      customerId: customer._id,
      isActive: true,
    });

    // Create a map for quick lookup
    const customPriceMap = {};
    const now = new Date();
    
    customPrices.forEach(cp => {
      // Check if not expired
      if (!cp.expiresAt || new Date(cp.expiresAt) > now) {
        customPriceMap[cp.productId.toString()] = cp.customPrice;
      }
    });

    // Transform cart items with custom prices
    const transformedItems = cart.items
      .filter(item => item.productId) // Filter out items with deleted products
      .map(item => {
        const productId = item.productId._id.toString();
        const customPrice = customPriceMap[productId];

        return {
          _id: item._id.toString(),
          quantity: item.quantity,
          addedAt: item.addedAt,
          product: {
            _id: productId,
            name: item.productId.name,
            price: item.productId.price,
            customPrice: customPrice || null, // ✅ Add custom price
            images: item.productId.images,
            discountPercentage: item.productId.discountPercentage,
            discountStartDate: item.productId.discountStartDate,
            discountEndDate: item.productId.discountEndDate,
            quantity: item.productId.quantity,
            vendor: item.productId.vendorId ? {
              businessName: item.productId.vendorId.businessName,
              city: item.productId.vendorId.city,
              state: item.productId.vendorId.state,
            } : null,
          },
        };
      });

    return NextResponse.json({
      success: true,
      items: transformedItems,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}