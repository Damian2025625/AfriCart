import mongoose from 'mongoose';

const CustomProductPriceSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    customPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CustomProductPriceSchema.index({ productId: 1, customerId: 1 });
CustomProductPriceSchema.index({ vendorId: 1 });
CustomProductPriceSchema.index({ expiresAt: 1 });

const CustomProductPrice = mongoose.models.CustomProductPrice || 
  mongoose.model('CustomProductPrice', CustomProductPriceSchema);

export default CustomProductPrice;