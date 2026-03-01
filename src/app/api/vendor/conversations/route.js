import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
import Customer from '@/lib/mongodb/models/Customer';
import User from '@/lib/mongodb/models/User';
import Product from '@/lib/mongodb/models/Product';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    console.log('=== VENDOR CONVERSATIONS API START ===');
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded, userId:', decoded.userId, 'role:', decoded.role);
    } catch (error) {
      console.log('❌ Token error:', error.message);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'VENDOR') {
      console.log('❌ Not a vendor');
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();
    console.log('✅ DB connected');

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    console.log('📦 Vendor:', vendor ? vendor._id.toString() : 'NOT FOUND');
    
    if (!vendor) {
      console.log('⚠️ No vendor profile, returning empty');
      return NextResponse.json({
        success: true,
        conversations: [],
      });
    }

    // First, let's see ALL conversations for this vendor
    const allConversations = await Conversation.find({ vendorId: vendor._id });
    console.log('📊 Total conversations for vendor:', allConversations.length);
    
    if (allConversations.length > 0) {
      console.log('First conversation sample:', {
        _id: allConversations[0]._id.toString(),
        customerId: allConversations[0].customerId?.toString(),
        productId: allConversations[0].productId?.toString(),
        isArchived: allConversations[0].isArchived,
        isPinned: allConversations[0].isPinned,
      });
    }

    // Now get only non-archived
    const conversations = await Conversation.find({ 
      vendorId: vendor._id,
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } },
        { isArchived: null }
      ]
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName phone',
        },
      })
      .populate('productId', 'name images price')
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .lean();

    console.log('💬 Non-archived conversations:', conversations.length);

    if (conversations.length > 0) {
      console.log('First populated conversation:', {
        _id: conversations[0]._id.toString(),
        customer: conversations[0].customerId,
        product: conversations[0].productId,
      });
    }

    const transformedConversations = conversations.map(conv => ({
      _id: conv._id.toString(),
      customer: conv.customerId?.userId ? {
        _id: conv.customerId._id.toString(),
        firstName: conv.customerId.userId.firstName,
        lastName: conv.customerId.userId.lastName,
        phone: conv.customerId.userId.phone,
      } : null,
      product: conv.productId ? {
        _id: conv.productId._id.toString(),
        name: conv.productId.name,
        images: conv.productId.images,
        price: conv.productId.price,
      } : null,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      isPinned: conv.isPinned || false,
      unreadCount: conv.unreadCount || 0,
      createdAt: conv.createdAt,
    }));

    console.log('✅ Returning', transformedConversations.length, 'conversations');
    console.log('=== VENDOR CONVERSATIONS API END ===');

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
    });
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
