import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import PriceOffer from '@/lib/mongodb/models/PriceOffer';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
import Message from '@/lib/mongodb/models/Message';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to verify JWT and get user
async function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Get vendor's received offers
export async function GET(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const query = { vendorId: vendor._id };
    
    if (status) {
      query.status = status;
    }

    const offers = await PriceOffer.find(query)
      .populate('productId', 'name price images')
      .populate('customerId')
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email phone',
        },
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error('Error fetching vendor offers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// PATCH - Accept or Decline offer
export async function PATCH(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { offerId, action, vendorResponse, counterMinPrice, counterMaxPrice } = body;

    if (!offerId || !action) {
      return NextResponse.json(
        { success: false, message: 'Offer ID and action are required' },
        { status: 400 }
      );
    }

    if (!['ACCEPT', 'DECLINE', 'COUNTER'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be ACCEPT, DECLINE, or COUNTER' },
        { status: 400 }
      );
    }

    // Validate counter-offer prices
    if (action === 'COUNTER') {
      if (!counterMinPrice || !counterMaxPrice) {
        return NextResponse.json(
          { success: false, message: 'Counter-offer prices are required' },
          { status: 400 }
        );
      }

      if (parseFloat(counterMaxPrice) <= parseFloat(counterMinPrice)) {
        return NextResponse.json(
          { success: false, message: 'Counter max price must be greater than min price' },
          { status: 400 }
        );
      }
    }

    // Get offer
    const offer = await PriceOffer.findOne({
      _id: offerId,
      vendorId: vendor._id,
    }).populate('productId').populate('customerId');

    if (!offer) {
      return NextResponse.json(
        { success: false, message: 'Offer not found' },
        { status: 404 }
      );
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'This offer has already been processed' },
        { status: 400 }
      );
    }

    // Check if offer expired
    if (new Date() > new Date(offer.expiresAt)) {
      offer.status = 'EXPIRED';
      await offer.save();
      return NextResponse.json(
        { success: false, message: 'This offer has expired' },
        { status: 400 }
      );
    }

    if (action === 'ACCEPT') {
      // Accept the offer
      offer.status = 'ACCEPTED';
      offer.acceptedAt = new Date();
      offer.vendorResponse = vendorResponse?.trim() || null;

      // Create or get conversation
      let conversation = await Conversation.findOne({
        customerId: offer.customerId._id,
        vendorId: vendor._id,
        productId: offer.productId._id,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          customerId: offer.customerId._id,
          vendorId: vendor._id,
          productId: offer.productId._id,
          lastMessage: 'Price offer accepted',
          lastMessageAt: new Date(),
        });
      }

      offer.conversationId = conversation._id;

      // Send auto-message to customer
      const autoMessage = `✅ Great news! I've accepted your price offer for "${offer.productId.name}".\n\nYour offered range: ₦${offer.minPrice.toLocaleString()} - ₦${offer.maxPrice.toLocaleString()}\n\nLet's discuss and finalize the exact price. ${vendorResponse ? `\n\nVendor's note: ${vendorResponse}` : ''}`;

      await Message.create({
        conversationId: conversation._id,
        senderId: user.userId,
        content: autoMessage,
        isRead: false,
      });

      conversation.lastMessage = autoMessage;
      conversation.lastMessageAt = new Date();
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      await conversation.save();

      await offer.save();

      return NextResponse.json({
        success: true,
        message: 'Offer accepted successfully',
        offer,
        conversationId: conversation._id,
      });
    } else if (action === 'COUNTER') {
      // Save original customer offer if this is the first counter
      if (!offer.counterOffers || offer.counterOffers.length === 0) {
        // Store the original customer offer first
        offer.counterOffers = [{
          offeredBy: 'CUSTOMER',
          minPrice: offer.minPrice,
          maxPrice: offer.maxPrice,
          note: offer.customerNote || null,
          createdAt: offer.createdAt,
        }];
      }

      // Counter the offer
      offer.status = 'COUNTERED';
      offer.currentOfferBy = 'VENDOR';
      offer.counterCount = (offer.counterCount || 0) + 1;

      // Add vendor's counter to history
      offer.counterOffers.push({
        offeredBy: 'VENDOR',
        minPrice: parseFloat(counterMinPrice),
        maxPrice: parseFloat(counterMaxPrice),
        note: vendorResponse?.trim() || null,
        createdAt: new Date(),
      });

      // DON'T update the main minPrice/maxPrice - keep original offer intact
      // Only update the vendor response
      offer.vendorResponse = vendorResponse?.trim() || null;

      await offer.save();

      return NextResponse.json({
        success: true,
        message: 'Counter-offer sent successfully',
        offer,
      });
    } else if (action === 'DECLINE') {
      // Decline the offer
      offer.status = 'DECLINED';
      offer.declinedAt = new Date();
      offer.vendorResponse = vendorResponse?.trim() || null;
      await offer.save();

      return NextResponse.json({
        success: true,
        message: 'Offer declined',
        offer,
      });
    }
  } catch (error) {
    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process offer' },
      { status: 500 }
    );
  }
}