import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import Product from '@/lib/mongodb/models/Product';
import Review from '@/lib/mongodb/models/Review';
import Category from '@/lib/mongodb/models/Category';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const vendor = await Vendor.findById(id).select('-bankAccount -paystackSubaccount -flutterwaveSubaccount');

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;

    let query = { isActive: true, vendorId: vendor._id };

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const vendorProductIds = products.map(p => p._id);

    const vendorReviews = await Review.find({
      productId: { $in: vendorProductIds }
    }).select('rating');

    let vendorRating = vendor.rating || 0;
    let vendorTotalRatings = vendor.totalRatings || 0;

    if (vendorReviews.length > 0) {
      const totalRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
      vendorRating = Number((totalRating / vendorReviews.length).toFixed(1));
      vendorTotalRatings = vendorReviews.length;
    }

    const transformedProducts = products.map((product) => ({
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
      images: product.images || [],
      discountPercentage: product.discountPercentage || 0,
      totalSold: product.totalSold || 0,
      categoryId: product.categoryId?._id?.toString(),
      category: product.categoryId ? { name: product.categoryId.name } : null,
    }));

    const vendorData = {
        _id: vendor._id.toString(),
        businessName: vendor.businessName,
        description: vendor.description,
        city: vendor.city,
        state: vendor.state,
        country: vendor.country,
        logoUrl: vendor.logoUrl,
        rating: vendorRating,
        totalRatings: vendorTotalRatings,
        createdAt: vendor.createdAt
    };

    return NextResponse.json({
      success: true,
      vendor: vendorData,
      products: transformedProducts,
      total: transformedProducts.length,
    });
  } catch (error) {
    console.error('Vendor details error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch vendor details' },
      { status: 500 }
    );
  }
}
