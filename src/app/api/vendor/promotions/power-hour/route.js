import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import PowerHour from '@/lib/mongodb/models/PowerHour';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';

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
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId, minAcceptablePrice, maxAcceptablePrice, durationHours } = body;

    // Validation
    if (!productId || !minAcceptablePrice || !maxAcceptablePrice || !durationHours) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const product = await Product.findOne({ _id: productId, vendorId: vendor._id });
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    // Check for existing active power hour
    const existing = await PowerHour.findOne({ 
      productId: product._id, 
      status: 'ACTIVE',
      endTime: { $gt: new Date() }
    });

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        message: 'This product already has an active Power Hour!' 
      }, { status: 400 });
    }

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + parseInt(durationHours));

    const session = await PowerHour.create({
      productId: product._id,
      vendorId: vendor._id,
      minAcceptablePrice: parseFloat(minAcceptablePrice),
      maxAcceptablePrice: parseFloat(maxAcceptablePrice),
      endTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Power Hour launched! Offers in your range will be auto-accepted.',
      session,
    });
  } catch (error) {
    console.error('Error creating power hour:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }

    const sessions = await PowerHour.find({ vendorId: vendor._id })
      .populate('productId', 'name price images views')
      .sort({ createdAt: -1 })
      .lean();

    const PriceOffer = (await import('@/lib/mongodb/models/PriceOffer')).default;
    
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
      const acceptedCount = await PriceOffer.countDocuments({
        productId: session.productId._id,
        status: { $in: ['ACCEPTED', 'CLAIMED', 'COMPLETED'] },
        acceptedAt: { $gte: session.startTime, $lte: session.endTime }
      });
      return { ...session, acceptedCount };
    }));

    return NextResponse.json({
      success: true,
      sessions: enrichedSessions,
    });
  } catch (error) {
    console.error('Error fetching power hours:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
