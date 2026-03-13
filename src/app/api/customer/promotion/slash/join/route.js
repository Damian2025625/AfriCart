import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import CommunitySlash from '@/lib/mongodb/models/CommunitySlash';
import Product from '@/lib/mongodb/models/Product';
import User from '@/lib/mongodb/models/User';
import { sendSlashSuccessNotifications } from '@/lib/notifications';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please login as a customer.' }, { status: 401 });
    }

    const { slashId } = await request.json();

    if (!slashId) {
      return NextResponse.json({ success: false, message: 'Slash ID is required' }, { status: 400 });
    }

    const session = await CommunitySlash.findById(slashId).populate('productId');

    if (!session) {
      return NextResponse.json({ success: false, message: 'Slash session not found' }, { status: 404 });
    }

    if (session.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: `This session is already ${session.status.toLowerCase()}.` }, { status: 400 });
    }

    if (new Date() > new Date(session.endTime)) {
      session.status = 'EXPIRED';
      await session.save();
      return NextResponse.json({ success: false, message: 'This session has expired.' }, { status: 400 });
    }

    // Check if user already joined
    const alreadyJoined = session.participants.some(p => p.userId.toString() === user.userId);
    if (alreadyJoined) {
      return NextResponse.json({ success: false, message: 'You have already joined this group buy.' }, { status: 400 });
    }

    // Add participant
    session.participants.push({ userId: user.userId });
    session.currentCount = session.participants.length;

    // Check if target reached
    if (session.currentCount >= session.targetCount) {
      session.status = 'SUCCESS';
      // Start the purchase window (24 hours from now)
      session.purchaseWindowStartTime = new Date();
      const pEndTime = new Date();
      pEndTime.setHours(pEndTime.getHours() + 24);
      session.purchaseWindowEndTime = pEndTime;
      
      // Trigger notifications to all participants
      const participantsWithDetails = await CommunitySlash.findById(session._id)
        .populate('participants.userId', 'firstName lastName email phone');
      
      if (participantsWithDetails) {
        // Run in background
        sendSlashSuccessNotifications({
          participants: participantsWithDetails.participants,
          product: session.productId,
          slashedPrice: session.slashedPrice
        }).catch(err => console.error('Failed to send slash notifications:', err));
      }
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: session.status === 'SUCCESS' ? 'Target reached! You can now buy at the slashed price.' : 'You have joined the group buy. Share with friends to reach the target!',
      session: {
        id: session._id,
        currentCount: session.currentCount,
        targetCount: session.targetCount,
        status: session.status,
      }
    });
  } catch (error) {
    console.error('Error joining slash session:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
