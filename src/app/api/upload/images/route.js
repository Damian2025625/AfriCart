import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '@/lib/cloudinary';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to verify JWT and get user
async function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    const user = await verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { images } = body; // Array of base64 images

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No images provided' },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { success: false, message: 'Maximum 5 images allowed' },
        { status: 400 }
      );
    }

    // Upload images to Cloudinary
    const uploadResults = await uploadMultipleToCloudinary(
      images,
      'marketplace/products'
    );

    // Extract URLs
    const imageUrls = uploadResults.map((result) => result.url);

    return NextResponse.json({
      success: true,
      message: 'Images uploaded successfully',
      images: imageUrls,
      uploadResults: uploadResults, // Include full results for reference
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload images' },
      { status: 500 }
    );
  }
}