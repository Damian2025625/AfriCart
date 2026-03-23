import { NextResponse } from 'next/server';
import Vendor from '@/lib/mongodb/models/Vendor';
import Customer from '@/lib/mongodb/models/Customer';
import { verifyAuth, handleAuthError } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    
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
        profilePicture: user.profilePicture || null,
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
    if (error.status) {
      return handleAuthError(error);
    }
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}