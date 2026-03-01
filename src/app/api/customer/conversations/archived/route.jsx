import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
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
        conversations: [],
      });
    }

    const conversations = await Conversation.find({ 
      customerId: customer._id,
      isArchived: true
    })
      .populate({
        path: 'vendorId',
        select: 'businessName logoUrl city state',
      })
      .populate('productId', 'name images price')
      .sort({ lastMessageAt: -1 });

    const transformedConversations = conversations.map(conv => ({
      _id: conv._id.toString(),
      vendor: conv.vendorId ? {
        _id: conv.vendorId._id.toString(),
        businessName: conv.vendorId.businessName,
        logoUrl: conv.vendorId.logoUrl,
        city: conv.vendorId.city,
        state: conv.vendorId.state,
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
    console.error('Get archived customer conversations error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}