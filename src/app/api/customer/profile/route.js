import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import Customer from '@/lib/mongodb/models/Customer';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    await connectDB();

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const customer = await Customer.findOne({ userId: user._id });

    return NextResponse.json({
      success: true,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture || null,
        country: customer?.country || '',
        state: customer?.state || '',
        city: customer?.city || '',
        deliveryAddress: customer?.deliveryAddress || '',
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      phone, 
      country, 
      state, 
      city, 
      deliveryAddress,
      profilePicture,
    } = body;

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update User fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Update Customer fields
    const customerData = {
      country,
      state,
      city,
      deliveryAddress
    };

    // Remove undefined fields
    Object.keys(customerData).forEach(key => 
      customerData[key] === undefined && delete customerData[key]
    );

    let customer = await Customer.findOne({ userId: user._id });
    
    if (customer) {
      Object.assign(customer, customerData);
      await customer.save();
    } else {
      customer = await Customer.create({
        userId: user._id,
        ...customerData
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture || null,
        country: customer.country,
        state: customer.state,
        city: customer.city,
        deliveryAddress: customer.deliveryAddress,
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
