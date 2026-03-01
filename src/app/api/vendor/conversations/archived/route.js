import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json({
        success: true,
        conversations: [],
      });
    }

    const conversations = await Conversation.find({ 
      vendorId: vendor._id,
      isArchived: true
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName phone',
        },
      })
      .populate('productId', 'name images price')
      .sort({ lastMessageAt: -1 });

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

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
    });
  } catch (error) {
    console.error('Get archived conversations error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}