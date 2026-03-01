import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Cart from '@/lib/mongodb/models/Cart';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function DELETE(request) {
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

    if (decoded.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, message: 'Customers only' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const cart = await Cart.findOne({ customerId: customer._id });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: 'Cart not found' },
        { status: 404 }
      );
    }

    // Remove the item
    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );

    await cart.save();

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to remove item' },
      { status: 500 }
    );
  }
}