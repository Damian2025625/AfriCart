import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Cart from '@/lib/mongodb/models/Cart';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import CustomProductPrice from '@/lib/mongodb/models/CustomProductPrice';
import CommunitySlash from '@/lib/mongodb/models/CommunitySlash';
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

    const now = new Date();

    // Fetch all custom prices for this customer
    const customPrices = await CustomProductPrice.find({
      productId: { $in: productIds },
      customerId: customer._id,
      isActive: true,
    });

    const customPriceMap = {};
    customPrices.forEach(cp => {
      if (!cp.expiresAt || new Date(cp.expiresAt) > now) {
        customPriceMap[cp.productId.toString()] = cp.customPrice;
      }
    });

    // Fetch all successful slash sessions for this customer
    const slashSessions = await CommunitySlash.find({
      productId: { $in: productIds },
      status: 'SUCCESS',
      'participants.userId': decoded.userId, // Use userId from token for consistency or customer.userId
      purchaseWindowEndTime: { $gt: now },
    });

    const slashPriceMap = {};
    slashSessions.forEach(ss => {
      slashPriceMap[ss.productId.toString()] = ss.slashedPrice;
    });

    // Fetch all accepted price offers for this customer
    const PriceOffer = (await import('@/lib/mongodb/models/PriceOffer')).default;
    const acceptedOffers = await PriceOffer.find({
      productId: { $in: productIds },
      customerId: customer._id,
      status: { $in: ['ACCEPTED', 'CLAIMED'] },
      expiresAt: { $gt: now },
    });

    const offerPriceMap = {};
    acceptedOffers.forEach(o => {
      offerPriceMap[o.productId.toString()] = o.finalPrice || o.maxPrice;
    });

    // Transform cart items with custom prices, slashed prices, and negotiated offers
    const transformedItems = cart.items
      .filter(item => item.productId)
      .map(item => {
        const productId = item.productId._id.toString();
        const customPrice = customPriceMap[productId];
        const slashedPrice = slashPriceMap[productId];
        const offerPrice = offerPriceMap[productId];

        // Preference: Negotiated Offer > Custom Price > Slashed Price > Regular Price
        const effectivePrice = offerPrice || customPrice || slashedPrice || null;

        return {
          _id: item._id.toString(),
          quantity: item.quantity,
          addedAt: item.addedAt,
          product: {
            _id: productId,
            name: item.productId.name,
            price: item.productId.price,
            customPrice: effectivePrice, // ✅ Use effective price
            isSlashed: !!slashedPrice && !customPrice, // Mark if it came from a slash
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