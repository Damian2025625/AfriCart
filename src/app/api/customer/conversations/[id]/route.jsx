import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Conversation from '@/lib/mongodb/models/Conversation';
import Vendor from '@/lib/mongodb/models/Vendor';
import Product from '@/lib/mongodb/models/Product';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request, { params }) {
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

    const { id } = await params;

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const conversation = await Conversation.findOne({
      _id: id,
      customerId: customer._id,
    })
      .populate('vendorId', 'businessName logoUrl')
      .populate('productId', 'name images price');

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const transformedConversation = {
      _id: conversation._id.toString(),
      vendor: conversation.vendorId ? {
        _id: conversation.vendorId._id.toString(),
        businessName: conversation.vendorId.businessName,
        logoUrl: conversation.vendorId.logoUrl,
      } : null,
      product: conversation.productId ? {
        _id: conversation.productId._id.toString(),
        name: conversation.productId.name,
        images: conversation.productId.images,
        price: conversation.productId.price,
      } : null,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };

    return NextResponse.json({
      success: true,
      conversation: transformedConversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}