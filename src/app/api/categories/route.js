import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Category from '@/lib/mongodb/models/Category';
import Product from '@/lib/mongodb/models/Product';

export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .select('name description')
      .lean();

    // Get product counts for all categories in one aggregation
    const productCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    // Build a map of categoryId -> count
    const countMap = {};
    productCounts.forEach(({ _id, count }) => {
      if (_id) countMap[_id.toString()] = count;
    });

    // Attach count to each category
    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      product_count: countMap[cat._id.toString()] || 0,
    }));

    return NextResponse.json({
      success: true,
      categories: categoriesWithCount,
    });
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}