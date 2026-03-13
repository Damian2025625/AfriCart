import mongoose from 'mongoose';

const CommunitySlashSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    targetCount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    slashedPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'EXPIRED'],
      default: 'PENDING',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    purchaseWindowStartTime: {
      type: Date,
    },
    purchaseWindowEndTime: {
      type: Date,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        hasPurchased: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
CommunitySlashSchema.index({ productId: 1, status: 1 });
CommunitySlashSchema.index({ vendorId: 1 });
CommunitySlashSchema.index({ endTime: 1 });

export default mongoose.models.CommunitySlash || mongoose.model('CommunitySlash', CommunitySlashSchema);
