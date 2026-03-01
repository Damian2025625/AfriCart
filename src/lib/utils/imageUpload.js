// utils/imageUpload.js

/**
 * Convert File object to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 encoded string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Convert multiple File objects to base64 strings
 * @param {File[]} files - Array of files to convert
 * @returns {Promise<string[]>} - Array of base64 encoded strings
 */
export const filesToBase64 = async (files) => {
  const promises = files.map((file) => fileToBase64(file));
  return Promise.all(promises);
};

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export const validateImage = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  } = options;

  const errors = [];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    errors.push(`File too large. Maximum size: ${maxSizeMB}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate multiple image files
 * @param {File[]} files - Array of files to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export const validateImages = (files, options = {}) => {
  const { maxFiles = 5 } = options;
  const errors = [];
  const validFiles = [];

  // Check max files
  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum: ${maxFiles}`);
    return { isValid: false, errors, validFiles };
  }

  // Validate each file
  files.forEach((file, index) => {
    const validation = validateImage(file, options);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`File ${index + 1} (${file.name}): ${validation.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validFiles,
  };
};

/**
 * Compress image before upload (optional)
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
    } = options;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          file.type,
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Upload images to API
 * @param {File[]} files - Array of image files
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Upload result
 */
export const uploadImagesToAPI = async (files, token) => {
  try {
    // Convert files to base64
    const base64Images = await filesToBase64(files);

    // Upload to API
    const response = await fetch('/api/upload/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        images: base64Images,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload images');
    }

    return data;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Get image preview URL from File object
 * @param {File} file - Image file
 * @returns {string} - Object URL for preview
 */
export const getImagePreviewUrl = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Clean up object URLs to prevent memory leaks
 * @param {string[]} urls - Array of object URLs to revoke
 */
export const revokeImagePreviewUrls = (urls) => {
  urls.forEach((url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
};