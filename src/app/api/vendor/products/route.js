import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import Product from '@/lib/mongodb/models/Product';
import Vendor from '@/lib/mongodb/models/Vendor';
import jwt from 'jsonwebtoken';
import { uploadMultipleToCloudinary } from '@/lib/cloudinary';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // Get token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendors only' },
        { status: 403 }
      );
    }

    await connectDB();

    // Find vendor by userId
    const vendor = await Vendor.findOne({ userId: decoded.userId });
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!body.categoryId) {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      );
    }

    if (!body.price || parseFloat(body.price) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid price is required' },
        { status: 400 }
      );
    }

    // ✨ NEW: Handle Cloudinary image upload
    let imageUrls = [];
    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      try {
        console.log(`Uploading ${body.images.length} images to Cloudinary...`);
        
        // Upload images to Cloudinary
        const uploadResults = await uploadMultipleToCloudinary(
          body.images,
          'marketplace/products'
        );
        
        // Extract URLs from upload results
        imageUrls = uploadResults.map((result) => result.url);
        
        console.log('Images uploaded successfully:', imageUrls);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json(
          { success: false, message: 'Failed to upload images. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Generate SKU if not provided
    const sku = body.sku || `${vendor._id.toString().slice(-6)}-${Date.now()}`;

    // Create product with Cloudinary URLs
    const product = await Product.create({
      vendorId: vendor._id,
      name: body.name.trim(),
      description: body.description || null,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || null,
      price: parseFloat(body.price),
      quantity: parseInt(body.quantity) || 0,
      lowStockThreshold: body.lowStockThreshold !== undefined ? parseInt(body.lowStockThreshold) : 5,
      weight: parseFloat(body.weight) || 1,
      sku,
      images: imageUrls, // ✨ Cloudinary URLs instead of blob URLs
      features: body.features || [],
      discountPercentage: parseFloat(body.discountPercentage) || 0,
      discountStartDate: body.discountStartDate || null,
      discountEndDate: body.discountEndDate || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    console.log('Product created:', product._id);

    return NextResponse.json({
      success: true,
      message: 'Product added successfully',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        images: product.images, // Return Cloudinary URLs
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Add product error:', error);
    
    // Handle duplicate SKU error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'SKU already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}