import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Conversation from '@/lib/mongodb/models/Conversation';
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

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id: conversationId } = await params;
    const body = await request.json();
    const { action } = body; // 'pin', 'unpin', 'archive', 'unarchive', 'markUnread'

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

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

    // Handle different actions
    switch (action) {
      case 'pin':
        conversation.isPinned = true;
        break;
      case 'unpin':
        conversation.isPinned = false;
        break;
      case 'archive':
        conversation.isArchived = true;
        break;
      case 'unarchive':
        conversation.isArchived = false;
        break;
      case 'markUnread':
        conversation.unreadCount = 1;
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    await conversation.save();

    return NextResponse.json({
      success: true,
      message: 'Conversation updated',
    });
  } catch (error) {
    console.error('Manage conversation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    await Conversation.findOneAndDelete({
      _id: conversationId,
      vendorId: vendor._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}