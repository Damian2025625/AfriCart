import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
import Message from '@/lib/mongodb/models/Message';
import User from '@/lib/mongodb/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// GET - Fetch messages
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

    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const afterMessageId = searchParams.get('after');

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Verify conversation belongs to vendor
    const conversation = await Conversation.findOne({
      _id: conversationId,
      vendorId: vendor._id,
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Build query
    const query = { conversationId };

    // If afterMessageId is provided, only fetch messages after that ID
    if (afterMessageId) {
      const afterMessage = await Message.findById(afterMessageId);
      if (afterMessage) {
        query.createdAt = { $gt: afterMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName')
      .sort({ createdAt: 1 });

    const transformedMessages = messages.map(message => ({
      _id: message._id.toString(),
      content: message.content,
      sender: message.senderId ? {
        _id: message.senderId._id.toString(),
        firstName: message.senderId.firstName,
        lastName: message.senderId.lastName,
      } : null,
      attachments: message.attachments || [],
      isRead: message.isRead,
      createdAt: message.createdAt,
    }));

    return NextResponse.json({
      success: true,
      messages: transformedMessages,
    });
  } catch (error) {
    console.error('Get vendor messages error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send message
export async function POST(request, { params }) {
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

    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, attachments } = body;

    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'Message content or attachment is required' },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Verify conversation belongs to vendor
    const conversation = await Conversation.findOne({
      _id: conversationId,
      vendorId: vendor._id,
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = await Message.create({
      conversationId,
      senderId: decoded.userId,
      content: content ? content.trim() : '',
      attachments: attachments || [],
      isRead: false,
    });

    // Update conversation's last message AND increment unread count for the OTHER party (customer)
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content ? content.trim() : (attachments?.length > 0 ? "Sent an attachment" : ""),
      lastMessageAt: new Date(),
      $inc: { unreadCount: 1 },
    });

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName');

    const transformedMessage = {
      _id: populatedMessage._id.toString(),
      content: populatedMessage.content,
      sender: populatedMessage.senderId ? {
        _id: populatedMessage.senderId._id.toString(),
        firstName: populatedMessage.senderId.firstName,
        lastName: populatedMessage.senderId.lastName,
      } : null,
      attachments: populatedMessage.attachments || [],
      isRead: populatedMessage.isRead,
      createdAt: populatedMessage.createdAt,
    };

    return NextResponse.json({
      success: true,
      message: transformedMessage,
    });
  } catch (error) {
    console.error('Send vendor message error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}