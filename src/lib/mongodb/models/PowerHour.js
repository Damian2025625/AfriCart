import mongoose from 'mongoose';

const PowerHourSchema = new mongoose.Schema(
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
    minAcceptablePrice: {
      type: Number,
      required: true,
    },
    maxAcceptablePrice: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active power hours
PowerHourSchema.index({ productId: 1, status: 1, endTime: 1 });
PowerHourSchema.index({ vendorId: 1 });

const PowerHour = mongoose.models.PowerHour || mongoose.model('PowerHour', PowerHourSchema);

export default PowerHour;
