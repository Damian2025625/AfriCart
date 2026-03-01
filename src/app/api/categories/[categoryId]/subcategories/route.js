import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Subcategory from '@/lib/mongodb/models/Subcategory';

export async function GET(request, { params }) {
  try {
    await connectDB();

    // ✅ Await params in Next.js 15
    const { categoryId } = await params;

    const subcategories = await Subcategory.find({ 
      categoryId, 
      isActive: true 
    }).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      subcategories,
    });
  } catch (error) {
    console.error('Subcategories error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}