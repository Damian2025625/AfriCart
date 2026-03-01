import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Conversation from '@/lib/mongodb/models/Conversation';
import Message from '@/lib/mongodb/models/Message';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(request, { params }) {
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

    const { id: conversationId } = await params;

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify conversation belongs to customer
    const conversation = await Conversation.findOne({
      _id: conversationId,
      customerId: customer._id,
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Mark all messages in this conversation as read (except those sent by current user)
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: decoded.userId },
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // Reset the unread count on the conversation so the badge clears
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { unreadCount: 0 },
    });

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}