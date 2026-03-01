import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import Vendor from '@/lib/mongodb/models/Vendor';
import Customer from '@/lib/mongodb/models/Customer';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user (without password)
    const user = await User.findById(decoded.userId).select('-password').lean();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let vendorData = null;
    let customerData = null;
    
    // If VENDOR, get vendor info
    if (user.role === 'VENDOR') {
      vendorData = await Vendor.findOne({ userId: user._id }).lean();
    } 
    // If CUSTOMER, get customer info
    else if (user.role === 'CUSTOMER') {
      customerData = await Customer.findOne({ userId: user._id }).lean();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
      vendor: vendorData ? {
        id: vendorData._id,
        businessName: vendorData.businessName,
        businessPhone: vendorData.businessPhone,
        businessAddress: vendorData.businessAddress,
        description: vendorData.description,
        categories: vendorData.categories,
        logoUrl: vendorData.logoUrl,
        rating: vendorData.rating,
        totalRatings: vendorData.totalRatings,
        isVerified: vendorData.isVerified,
        city: vendorData.city,
        state: vendorData.state,
        country: vendorData.country,
      } : null,
      customer: customerData ? {
        id: customerData._id,
        country: customerData.country,
        state: customerData.state,
        city: customerData.city,
        deliveryAddress: customerData.deliveryAddress,
      } : null,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}