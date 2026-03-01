import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
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
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ FIXED INDEX - One review per customer per product (orderId not included)
ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

// Additional indexes for queries
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1 });

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

export default Review;