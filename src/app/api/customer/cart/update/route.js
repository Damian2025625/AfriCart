import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Customer from '@/lib/mongodb/models/Customer';
import Cart from '@/lib/mongodb/models/Cart';
import Product from '@/lib/mongodb/models/Product';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(request) {
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
    const { productId, quantity } = body;

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID or quantity' },
        { status: 400 }
      );
    }

    // Verify product exists and has enough stock
    const product = await Product.findById(productId);
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, message: 'Product not available' },
        { status: 404 }
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

    // Find the item first
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Item not in cart' },
        { status: 404 }
      );
    }

    const currentQuantity = cart.items[itemIndex].quantity;

    // Determine the absolute max they can have
    if (quantity > currentQuantity && product.quantity < quantity) {
      return NextResponse.json(
        { success: false, message: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // We allow the quantity to be what they requested, as long as it's not a direct increase exceeding stock.
    const finalQuantity = quantity;

    if (finalQuantity < 1) {
       return NextResponse.json(
          { success: false, message: 'Product is out of stock' },
          { status: 400 }
       );
    }

    cart.items[itemIndex].quantity = finalQuantity;
    cart.items[itemIndex].addedAt = new Date();

    await cart.save();

    return NextResponse.json({
      success: true,
      message: 'Cart updated successfully',
      updatedQuantity: finalQuantity
    });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update cart' },
      { status: 500 }
    );
  }
}