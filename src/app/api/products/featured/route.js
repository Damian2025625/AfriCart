import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 8;
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Single lean query — no ratings, no extra DB hits
    const products = await Product.find({ 
      isActive: true,
      'images.0': { $exists: true } 
    })
      .populate('categoryId', 'name')
      .populate('vendorId', 'businessName city state logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    if (products.length === 0) {
      return NextResponse.json({ success: true, products: [] });
    }

    const transformedProducts = products.map(product => ({
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      category: product.categoryId ? { name: product.categoryId.name } : null,
      vendor: product.vendorId ? {
        businessName: product.vendorId.businessName,
        city: product.vendorId.city,
        state: product.vendorId.state,
        logoUrl: product.vendorId.logoUrl,
      } : null,
      price: product.price,
      quantity: product.quantity,
      images: product.images,
      features: product.features,
      discountPercentage: product.discountPercentage,
      discountStartDate: product.discountStartDate,
      discountEndDate: product.discountEndDate,
      isActive: product.isActive,
      views: product.views,
      totalSold: product.totalSold,
      createdAt: product.createdAt,
    }));

    return NextResponse.json({
      success: true,
      products: transformedProducts,
    });
  } catch (error) {
    console.error('Featured products error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}