import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Category from '@/lib/mongodb/models/Category';
import Vendor from '@/lib/mongodb/models/Vendor';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const excludeId = searchParams.get('excludeId');
    const limit = parseInt(searchParams.get('limit')) || 4;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      );
    }

    const query = {
      categoryId,
      isActive: true,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('vendorId', 'businessName city state')
      .limit(limit)
      .sort({ createdAt: -1 });

    const transformedProducts = products.map(product => ({
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
      images: product.images,
      category: product.categoryId ? { name: product.categoryId.name } : null,
      vendor: product.vendorId ? {
        businessName: product.vendorId.businessName,
        city: product.vendorId.city,
        state: product.vendorId.state,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      products: transformedProducts,
    });
  } catch (error) {
    console.error('Get related products error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch related products' },
      { status: 500 }
    );
  }
}