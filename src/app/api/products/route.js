import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import Category from '@/lib/mongodb/models/Category';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 100;

    let query = { isActive: true };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .populate('vendorId', 'businessName city state')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const transformed = products.map((product) => ({
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      images: product.images || [],
      features: product.features || [],
      discountPercentage: product.discountPercentage || 0,
      discountStartDate: product.discountStartDate,
      discountEndDate: product.discountEndDate,
      isActive: product.isActive,
      views: product.views || 0,
      totalSold: product.totalSold || 0,
      createdAt: product.createdAt,
      categoryId: product.categoryId?._id?.toString(),
      category: product.categoryId ? { name: product.categoryId.name } : null,
      vendor: product.vendorId
        ? {
            _id: product.vendorId._id.toString(),
            businessName: product.vendorId.businessName,
            city: product.vendorId.city,
            state: product.vendorId.state,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      products: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
