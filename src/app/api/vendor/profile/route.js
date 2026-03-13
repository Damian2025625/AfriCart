import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import Vendor from '@/lib/mongodb/models/Vendor';

const JWT_SECRET = process.env.JWT_SECRET;

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const body = await request.json();
    const { 
      firstName, lastName, phone, profilePicture,
      businessName, businessDescription, businessAddress, businessPhone
    } = body;

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    let vendor = await Vendor.findOne({ userId: user._id });
    if (vendor) {
      if (businessName !== undefined) vendor.businessName = businessName;
      if (businessDescription !== undefined) vendor.description = businessDescription;
      if (businessAddress !== undefined) vendor.businessAddress = businessAddress;
      if (businessPhone !== undefined) vendor.businessPhone = businessPhone;
      await vendor.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePicture: user.profilePicture,
        businessName: vendor?.businessName,
      }
    });

  } catch (error) {
    console.error('Update vendor profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
