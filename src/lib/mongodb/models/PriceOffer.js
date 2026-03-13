import mongoose from 'mongoose';

const PriceOfferSchema = new mongoose.Schema(
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
    minPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    customerNote: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'NEGOTIATING', 'COMPLETED', 'EXPIRED', 'COUNTERED', 'CLAIMED'],
      default: 'PENDING',
    },
    vendorResponse: {
      type: String,
      trim: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    acceptedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
    // Counter-offer fields
    counterOffers: [{
      offeredBy: {
        type: String,
        enum: ['CUSTOMER', 'VENDOR'],
        required: true,
      },
      minPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      maxPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      note: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    currentOfferBy: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR'],
      default: 'CUSTOMER',
    },
    counterCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
PriceOfferSchema.index({ productId: 1, customerId: 1 });
PriceOfferSchema.index({ vendorId: 1, status: 1 });
PriceOfferSchema.index({ status: 1, expiresAt: 1 });
PriceOfferSchema.index({ customerId: 1, status: 1 });
PriceOfferSchema.index({ updatedAt: -1 });

const PriceOffer = mongoose.models.PriceOffer || 
  mongoose.model('PriceOffer', PriceOfferSchema);

export default PriceOffer;