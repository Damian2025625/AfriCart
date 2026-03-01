import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { file, resourceType } = await request.json(); // base64 file data string

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    // Determine resource_type based on prefix (data:audio/ or data:video/ or data:image/)
    let type = 'raw';
    if (file.startsWith('data:image')) type = 'image';
    else if (file.startsWith('data:audio') || file.startsWith('data:video')) type = 'video'; // Cloudinary treats audio as video

    const result = await cloudinary.uploader.upload(file, {
      folder: 'marketplace/chats',
      resource_type: type,
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      type: type === 'video' ? 'audio' : type
    });
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ success: false, message: 'Failed to upload media' }, { status: 500 });
  }
}
