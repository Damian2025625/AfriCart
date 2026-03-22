import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    images: {
      type: [String],
      default: [],
    },
    weight: {
      type: Number,
      default: 1, // weight in kg
    },
    features: {
      type: [String],
      default: [],
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },
    discountStartDate: {
      type: Date,
    },
    discountEndDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    activeSlashId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunitySlash',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Existing indexes
ProductSchema.index({ vendorId: 1, isActive: 1 });
ProductSchema.index({ categoryId: 1, isActive: 1 });

// Critical index for the featured products dashboard query:
// Product.find({ isActive: true, 'images.0': { $exists: true } }).sort({ createdAt: -1 })
ProductSchema.index({ isActive: 1, createdAt: -1 });

// Uncomment to enable full-text search on name and description:
// ProductSchema.index({ name: 'text', description: 'text' });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);