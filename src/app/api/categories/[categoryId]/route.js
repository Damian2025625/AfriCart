import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Category from '@/lib/mongodb/models/Category';

export async function GET(request, { params }) {
  try {
    await connectDB();

    // Next.js 15+ requires params to be awaited
    const { categoryId } = await params;

    const category = await Category.findById(categoryId).select('name description isActive imageUrl');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Category fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch category' },
      { status: 500 }
    );
  }
}
