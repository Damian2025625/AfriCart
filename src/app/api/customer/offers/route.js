import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import PriceOffer from '@/lib/mongodb/models/PriceOffer';
import Product from '@/lib/mongodb/models/Product';
import Customer from '@/lib/mongodb/models/Customer';
import Vendor from '@/lib/mongodb/models/Vendor';
import PowerHour from '@/lib/mongodb/models/PowerHour';
import { sendEmail } from '@/lib/email/nodemailer';
import axios from 'axios'; // For SMS

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

// POST - Submit a price offer
export async function POST(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, minPrice, maxPrice, customerNote } = body;

    // Validation
    if (!productId || !minPrice || !maxPrice) {
      return NextResponse.json(
        { success: false, message: 'Product ID, minimum price, and maximum price are required' },
        { status: 400 }
      );
    }

    if (parseFloat(minPrice) <= 0 || parseFloat(maxPrice) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Prices must be greater than 0' },
        { status: 400 }
      );
    }

    if (parseFloat(maxPrice) <= parseFloat(minPrice)) {
      return NextResponse.json(
        { success: false, message: 'Maximum price must be greater than minimum price' },
        { status: 400 }
      );
    }

    // Get product
    const product = await Product.findById(productId).populate('vendorId');
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, message: 'This product is not available' },
        { status: 400 }
      );
    }

    // Check if offer is reasonable (not more than product price)
    if (parseFloat(minPrice) > product.price) {
      return NextResponse.json(
        { success: false, message: 'Your minimum offer cannot exceed the product price' },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await Customer.findOne({ userId: user.userId });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Check for existing pending offer
    const existingOffer = await PriceOffer.findOne({
      productId,
      customerId: customer._id,
      status: 'PENDING',
    });

    if (existingOffer) {
      return NextResponse.json(
        { success: false, message: 'You already have a pending offer for this product' },
        { status: 400 }
      );
    }

    // Check for active Power Hour (Auto-Accept)
    const activePowerHour = await PowerHour.findOne({
      productId: productId,
      status: 'ACTIVE',
      endTime: { $gt: new Date() }
    });

    let offerStatus = 'PENDING';
    let finalPrice = null;

    if (activePowerHour) {
      const offerMin = parseFloat(minPrice);
      const offerMax = parseFloat(maxPrice);
      
      // Calculate the shared range (overlap)
      const sharedMax = Math.min(offerMax, activePowerHour.maxAcceptablePrice);
      const sharedMin = Math.max(offerMin, activePowerHour.minAcceptablePrice);

      // If the shared range is valid (customer max >= vendor min)
      if (sharedMax >= sharedMin) {
        offerStatus = 'ACCEPTED';
        finalPrice = sharedMax; // Best possible price for the vendor within the agreed overlap
      }
    }

    // Create offer
    const offer = await PriceOffer.create({
      productId,
      customerId: customer._id,
      vendorId: product.vendorId,
      minPrice: parseFloat(minPrice),
      maxPrice: parseFloat(maxPrice),
      customerNote: customerNote?.trim() || null,
      status: offerStatus,
      finalPrice,
      acceptedAt: offerStatus === 'ACCEPTED' ? new Date() : null,
      expiresAt: offerStatus === 'ACCEPTED' && activePowerHour ? activePowerHour.endTime : undefined,
    });

    return NextResponse.json({
      success: true,
      message: offerStatus === 'ACCEPTED' ? 'Offer auto-accepted by Power Hour! You can now finalize the sale.' : 'Price offer submitted successfully',
      offer: {
        _id: offer._id,
        minPrice: offer.minPrice,
        maxPrice: offer.maxPrice,
        status: offer.status,
        createdAt: offer.createdAt,
      },
    });
  } catch (error) {
    console.error('Error submitting price offer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit offer' },
      { status: 500 }
    );
  }
}

// GET - Get customer's offers
export async function GET(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customer = await Customer.findOne({ userId: user.userId });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    const query = { customerId: customer._id };
    
    if (productId) {
      query.productId = productId;
    }
    
    if (status) {
      query.status = status;
    }

    const offers = await PriceOffer.find(query)
      .populate('productId', 'name price images')
      .populate('vendorId', 'businessName')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// PATCH - Customer responds to vendor's counter-offer
export async function PATCH(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customer = await Customer.findOne({ userId: user.userId });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { offerId, action, counterMinPrice, counterMaxPrice, customerNote } = body;

    if (!offerId || !action) {
      return NextResponse.json(
        { success: false, message: 'Offer ID and action are required' },
        { status: 400 }
      );
    }

    if (!['ACCEPT_COUNTER', 'COUNTER_BACK', 'DECLINE_COUNTER', 'CLAIM_OFFER'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get offer
    const offer = await PriceOffer.findOne({
      _id: offerId,
      customerId: customer._id,
    }).populate('productId').populate('vendorId');

    if (!offer) {
      return NextResponse.json(
        { success: false, message: 'Offer not found' },
        { status: 404 }
      );
    }

    if (action === 'CLAIM_OFFER') {
      if (offer.status !== 'ACCEPTED') {
        return NextResponse.json(
          { success: false, message: 'Only accepted offers can be claimed' },
          { status: 400 }
        );
      }
      offer.status = 'CLAIMED';
      await offer.save();
      return NextResponse.json({
        success: true,
        message: 'Offer claimed successfully',
        offer
      });
    }

    if (offer.status !== 'COUNTERED') {
      return NextResponse.json(
        { success: false, message: 'This offer is not in counter state' },
        { status: 400 }
      );
    }

    if (action === 'ACCEPT_COUNTER') {
      // Customer accepts vendor's counter-offer
      const Conversation = (await import('@/lib/mongodb/models/Conversation')).default;
      const Message = (await import('@/lib/mongodb/models/Message')).default;

      offer.status = 'ACCEPTED';
      offer.acceptedAt = new Date();

      // Create or get conversation
      let conversation = await Conversation.findOne({
        customerId: customer._id,
        vendorId: offer.vendorId._id,
        productId: offer.productId._id,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          customerId: customer._id,
          vendorId: offer.vendorId._id,
          productId: offer.productId._id,
          lastMessage: 'Counter-offer accepted',
          lastMessageAt: new Date(),
        });
      }

      offer.conversationId = conversation._id;

      // Get the latest counter offer (vendor's counter)
      const latestCounter = offer.counterOffers[offer.counterOffers.length - 1];

      // Send auto-message
      const autoMessage = `✅ Customer accepted your counter-offer for "${offer.productId.name}".\n\nAgreed range: ₦${latestCounter.minPrice.toLocaleString()} - ₦${latestCounter.maxPrice.toLocaleString()}\n\nLet's finalize the exact price!`;

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
        message: 'Counter-offer accepted! You can now chat with the vendor.',
        offer,
        conversationId: conversation._id,
      });
    } else if (action === 'COUNTER_BACK') {
      // Customer makes another counter-offer
      if (!counterMinPrice || !counterMaxPrice) {
        return NextResponse.json(
          { success: false, message: 'Counter prices are required' },
          { status: 400 }
        );
      }

      if (parseFloat(counterMaxPrice) <= parseFloat(counterMinPrice)) {
        return NextResponse.json(
          { success: false, message: 'Max price must be greater than min price' },
          { status: 400 }
        );
      }

      // Limit counter rounds (e.g., max 10 back-and-forth)
      if (offer.counterCount >= 10) {
        return NextResponse.json(
          { success: false, message: 'Maximum counter-offer rounds reached. Please contact vendor directly.' },
          { status: 400 }
        );
      }

      offer.currentOfferBy = 'CUSTOMER';
      offer.counterCount = (offer.counterCount || 0) + 1;

      // Add to counter-offers history
      offer.counterOffers.push({
        offeredBy: 'CUSTOMER',
        minPrice: parseFloat(counterMinPrice),
        maxPrice: parseFloat(counterMaxPrice),
        note: customerNote?.trim() || null,
        createdAt: new Date(),
      });

      // DON'T update the main minPrice/maxPrice - keep original offer intact
      // Only update the customer note
      offer.customerNote = customerNote?.trim() || null;
      offer.status = 'PENDING'; // Back to pending for vendor to respond

      await offer.save();

      return NextResponse.json({
        success: true,
        message: 'Your counter-offer has been sent to the vendor',
        offer,
      });
    } else if (action === 'DECLINE_COUNTER') {
      // Customer declines vendor's counter
      offer.status = 'DECLINED';
      offer.declinedAt = new Date();
      await offer.save();

      return NextResponse.json({
        success: true,
        message: 'Counter-offer declined',
        offer,
      });
    }
  } catch (error) {
    console.error('Error responding to counter-offer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process response' },
      { status: 500 }
    );
  }
}