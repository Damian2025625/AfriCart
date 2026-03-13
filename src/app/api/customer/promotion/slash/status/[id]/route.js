import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import CommunitySlash from '@/lib/mongodb/models/CommunitySlash';
import Product from '@/lib/mongodb/models/Product';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params; // Product ID

    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }

    // Find active slash for this product
    const session = await CommunitySlash.findOne({
      productId: id,
      status: { $in: ['PENDING', 'SUCCESS'] }
    }).sort({ createdAt: -1 });

    if (!session) {
      return NextResponse.json({ success: true, session: null });
    }

    // Check if expired
    if (session.status === 'PENDING' && new Date() > new Date(session.endTime)) {
      session.status = 'EXPIRED';
      await session.save();
      return NextResponse.json({ success: true, session: null });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session._id,
        targetCount: session.targetCount,
        currentCount: session.currentCount,
        originalPrice: session.originalPrice,
        slashedPrice: session.slashedPrice,
        status: session.status,
        endTime: session.endTime,
        purchaseWindowEndTime: session.purchaseWindowEndTime,
        participants: session.participants.map(p => p.userId),
      }
    });
  } catch (error) {
    console.error('Error fetching slash status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
