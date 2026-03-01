import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Review from '@/lib/mongodb/models/Review';
import Category from '@/lib/mongodb/models/Category';
import Subcategory from '@/lib/mongodb/models/Subcategory';
import Vendor from '@/lib/mongodb/models/Vendor';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const product = await Product.findById(id)
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name')
      .populate('vendorId', 'businessName city state logoUrl');

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // ✅ Calculate vendor rating from ALL their products' reviews
    let vendorRating = 0;
    let vendorTotalRatings = 0;

    if (product.vendorId) {
      // Get all products by this vendor
      const vendorProducts = await Product.find({ 
        vendorId: product.vendorId._id 
      }).select('_id');

      const vendorProductIds = vendorProducts.map(p => p._id);

      // Get all reviews for all vendor products
      const vendorReviews = await Review.find({
        productId: { $in: vendorProductIds }
      }).select('rating');

      if (vendorReviews.length > 0) {
        const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
        vendorRating = Number((totalRating / vendorReviews.length).toFixed(1));
        vendorTotalRatings = vendorReviews.length;
      }
    }

    // Transform product data
    const transformedProduct = {
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      categoryId: product.categoryId?._id?.toString(),
      category: product.categoryId ? { 
        name: product.categoryId.name,
        slug: product.categoryId.slug 
      } : null,
      subcategory: product.subcategoryId ? { 
        name: product.subcategoryId.name 
      } : null,
      vendor: product.vendorId ? {
        _id: product.vendorId._id.toString(),
        businessName: product.vendorId.businessName,
        city: product.vendorId.city,
        state: product.vendorId.state,
        rating: vendorRating, // ✅ Calculated rating
        totalRatings: vendorTotalRatings, // ✅ Total number of reviews
        logoUrl: product.vendorId.logoUrl,
      } : null,
      price: product.price,
      quantity: product.quantity,
      sku: product.sku,
      images: product.images,
      features: product.features,
      discountPercentage: product.discountPercentage,
      discountStartDate: product.discountStartDate,
      discountEndDate: product.discountEndDate,
      isActive: product.isActive,
      views: product.views,
      totalSold: product.totalSold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json({
      success: true,
      product: transformedProduct,
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch product' },
      { status: 500 }
    );
  }
}