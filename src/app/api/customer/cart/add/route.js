import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Cart from '@/lib/mongodb/models/Cart';
import Product from '@/lib/mongodb/models/Product';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
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
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Verify product exists and is active
    const product = await Product.findById(productId);
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, message: 'Product not available' },
        { status: 404 }
      );
    }

    // Check stock
    if (product.quantity < quantity) {
      return NextResponse.json(
        { success: false, message: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await Customer.findOne({ userId: decoded.userId });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get or create cart
    let cart = await Cart.findOne({ customerId: customer._id });

    if (!cart) {
      cart = await Cart.create({
        customerId: customer._id,
        items: [],
      });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity — check stock vs TOTAL (already in cart + new request)
      const alreadyInCart = cart.items[existingItemIndex].quantity;
      const newTotal = alreadyInCart + quantity;

      if (product.quantity < newTotal) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${product.quantity} unit(s) available. You already have ${alreadyInCart} in your cart.`,
          },
          { status: 400 }
        );
      }

      cart.items[existingItemIndex].quantity = newTotal;
      cart.items[existingItemIndex].addedAt = new Date();
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity,
        addedAt: new Date(),
      });
    }

    await cart.save();

    return NextResponse.json({
      success: true,
      message: 'Product added to cart',
      cartItemCount: cart.items.length,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to add to cart' },
      { status: 500 }
    );
  }
}