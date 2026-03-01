import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
import Customer from '@/lib/mongodb/models/Customer';
import User from '@/lib/mongodb/models/User';
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const conversation = await Conversation.findOne({
      _id: id,
      vendorId: vendor._id,
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'firstName lastName phone',
        },
      })
      .populate('productId', 'name images price quantity');

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const transformedConversation = {
      _id: conversation._id.toString(),
      customer: conversation.customerId?.userId ? {
        _id: conversation.customerId._id.toString(),
        firstName: conversation.customerId.userId.firstName,
        lastName: conversation.customerId.userId.lastName,
        phone: conversation.customerId.userId.phone,
      } : null,
      product: conversation.productId ? {
        _id: conversation.productId._id.toString(),
        name: conversation.productId.name,
        images: conversation.productId.images,
        price: conversation.productId.price,
        quantity: conversation.productId.quantity,
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
    console.error('Get vendor conversation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}