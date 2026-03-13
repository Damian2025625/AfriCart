import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import CommunitySlash from '@/lib/mongodb/models/CommunitySlash';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import { clearCache } from "@/lib/cache";

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
    const { productId, targetCount, discountAmount, durationHours } = body;

    // Validation
    if (!productId || !targetCount || !discountAmount || !durationHours) {
      return NextResponse.json({ success: false, message: 'Missing required configuration fields' }, { status: 400 });
    }

    const product = await Product.findOne({ _id: productId, vendorId: vendor._id });
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found or access denied' }, { status: 404 });
    }

    // Check if there's already an active slash for this product
    const existingSlash = await CommunitySlash.findOne({ 
      productId: product._id, 
      status: 'PENDING' 
    });

    if (existingSlash) {
      return NextResponse.json({ 
        success: false, 
        message: 'This product already has an active Community Slashing session.' 
      }, { status: 400 });
    }

    // Calculate end time
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + parseInt(durationHours));

    const slashedPrice = product.price - parseFloat(discountAmount);
    if (slashedPrice <= 0) {
      return NextResponse.json({ success: false, message: 'Discount cannot be greater than product price' }, { status: 400 });
    }

    // Create session
    const slashSession = await CommunitySlash.create({
      productId: product._id,
      vendorId: vendor._id,
      targetCount: parseInt(targetCount),
      originalPrice: product.price,
      slashedPrice,
      endTime,
      status: 'PENDING',
    });

    // Update product to link to this session
    product.activeSlashId = slashSession._id;
    await product.save();

    // Clear product caches so the badges show up immediately
    clearCache();

    return NextResponse.json({
      success: true,
      message: 'Community Slashing campaign launched successfully!',
      slashSession,
    });
  } catch (error) {
    console.error('Error creating slash campaign:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get vendor's slash history or active ones
export async function GET(request) {
  try {
    await connectDB();

    const user = await verifyToken(request);
    console.log('[PromotionsAPI:GET] User decoded:', user);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    console.log('[PromotionsAPI:GET] Vendor found:', vendor ? vendor._id : 'NOT FOUND');
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }

    const sessions = await CommunitySlash.find({ vendorId: vendor._id })
      .populate('productId', 'name price images views')
      .sort({ createdAt: -1 });
    
    console.log('[PromotionsAPI:GET] Sessions count:', sessions.length);

    return NextResponse.json({
      success: true,
      sessions,
      debug: {
        vendorId: vendor._id,
        sessionCount: sessions.length
      }
    });
  } catch (error) {
    console.error('Error fetching slash sessions:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
