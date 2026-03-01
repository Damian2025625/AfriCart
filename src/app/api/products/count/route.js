import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    let query = { isActive: true };
    
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const count = await Product.countDocuments(query);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Product count error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to count products' },
      { status: 500 }
    );
  }
}