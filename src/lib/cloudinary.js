// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a single image to Cloudinary
 * @param {string} file - Base64 encoded image or file path
 * @param {string} folder - Cloudinary folder to store the image
 * @returns {Promise<Object>} - Upload result with secure_url
 */
export async function uploadToCloudinary(file, folder = 'marketplace/products') {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Limit max dimensions
        { quality: 'auto:good' }, // Optimize quality
        { fetch_format: 'auto' }, // Auto-select best format
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param {Array<string>} files - Array of base64 encoded images
 * @param {string} folder - Cloudinary folder to store the images
 * @returns {Promise<Array<Object>>} - Array of upload results
 */
export async function uploadMultipleToCloudinary(files, folder = 'marketplace/products') {
  try {
    const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error('Failed to upload images to Cloudinary');
  }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
}

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @returns {Promise<Array<Object>>} - Array of deletion results
 */
export async function deleteMultipleFromCloudinary(publicIds) {
  try {
    const deletePromises = publicIds.map((publicId) => deleteFromCloudinary(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Multiple deletion error:', error);
    throw new Error('Failed to delete images from Cloudinary');
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export function getPublicIdFromUrl(url) {
  if (!url) return null;
  
  // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  
  if (uploadIndex === -1) return null;
  
  // Get everything after 'upload/vXXXXXXXXXX/'
  const pathParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version
  const fullPath = pathParts.join('/');
  
  // Remove file extension
  return fullPath.replace(/\.[^/.]+$/, '');
}

export default cloudinary;