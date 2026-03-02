import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false, // Master orders don't have vendorId
  },
  
  items: [orderItemSchema],
  
  // Master/Sub-order relationship
  isMasterOrder: {
    type: Boolean,
    default: false,
  },
  masterOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  subOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  }],

  // Shipping Info
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String },
    additionalInfo: { type: String },
  },

  // Terminal Africa specific
  shippingDetails: {
    rateId: String,
    carrierId: String,
    carrierName: String,
    status: {
      type: String,
      enum: ['PENDING', 'ARRANGED', 'SHIPPED', 'DELIVERED', 'FAILED'],
      default: 'PENDING'
    }
  },

  // Pricing
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  isGiftWrapped: { type: Boolean, default: false },
  giftWrapFee: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Payment
  paymentMethod: {
    type: String,
    enum: ['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'CARD', 'PAYSTACK'],
    default: 'CASH_ON_DELIVERY',
  },
  paymentReference: { 
    type: String, 
    unique: true,
    sparse: true
  },
  paymentDetails: {
    amount: Number,
    paidAt: Date,
    channel: String,
    currency: String,
    transactionId: String, // ✅ Flutterwave transaction ID
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'],
    default: 'PENDING',
  },

  // Order Status
  orderStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },

  // ✅ ENHANCED: Vendor Performance Settlement Tracking
  vendorSettlement: {
    // Amount vendor will receive (after platform commission)
    amount: {
      type: Number,
      required: function() {
        return !this.isMasterOrder && this.vendorId != null;
      },
      default: 0,
    },
    
    // Platform commission (e.g., 3% of order total)
    platformCommission: {
      type: Number,
      default: 0,
    },
    
    // Platform commission rate (percentage)
    platformCommissionRate: {
      type: Number,
      default: 0.03, // 3%
    },
    
    // ✅ Settlement lifecycle status
    status: {
      type: String,
      enum: [
        'PENDING',       // Waiting for T+1 settlement
        'PROCESSING',    // In payout pipeline
        'SETTLED',       // Money transferred to vendor
        'FAILED',        // Settlement failed
        'ON_HOLD',       // Disputed/refunded
      ],
      default: 'PENDING',
      index: true,
    },
    
    paidAt: {
      type: Date,
      default: function() {
        return this.paymentStatus === 'PAID' ? new Date() : null;
      },
    },
    
    expectedSettlementDate: {
      type: Date,
      default: function() {
        if (this.paymentStatus === 'PAID') {
          const nextDay = new Date();
          nextDay.setDate(nextDay.getDate() + 1);
          const dayOfWeek = nextDay.getDay();
          if (dayOfWeek === 0) nextDay.setDate(nextDay.getDate() + 1);
          if (dayOfWeek === 6) nextDay.setDate(nextDay.getDate() + 2);
          return nextDay;
        }
        return null;
      }
    },
    
    settledAt: Date,
    
    // ✅ Paystack references (unified)
    transactionId: { 
      type: String,
      index: true, 
    },
    subaccountCode: { 
      type: String,
      index: true, 
    },
    transferReference: String,
    
    lastReconciledAt: Date,
    reconciliationAttempts: {
      type: Number,
      default: 0,
    },
    failureReason: String,
  },

  // ✅ New Dispute Tracking
  dispute: {
    isDisputed: { type: Boolean, default: false },
    reason: { type: String },
    status: { 
      type: String, 
      enum: ['NONE', 'PENDING', 'RESOLVED', 'REJECTED'],
      default: 'NONE'
    },
    customerMessage: String,
    adminNote: String,
    createdAt: Date,
    resolvedAt: Date,
  },

  // ✅ Escrow: 50/50 split
  escrow: {
    enabled:              { type: Boolean, default: false },
    totalAmount:          { type: Number, default: 0 },
    upfrontAmount:        { type: Number, default: 0 },
    heldAmount:           { type: Number, default: 0 },
    upfrontTransferCode:  { type: String },
    finalTransferCode:    { type: String },
    upfrontPaidAt:        { type: Date },
    releasedAt:           { type: Date },
    autoReleaseAt:        { type: Date },
    status: {
      type: String,
      enum: ['PENDING', 'UPFRONT_SENT', 'RELEASED', 'FAILED'],
      default: 'PENDING',
    },
    releaseReason: { type: String },
  },

  // Tracking
  trackingNumber: { type: String },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },

  // Notes
  customerNotes: { type: String },
  vendorNotes: { type: String },

}, {
  timestamps: true,
});

// ✅ CRITICAL INDEXES
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, isMasterOrder: 1, createdAt: -1 });
orderSchema.index({ vendorId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ isMasterOrder: 1 });
orderSchema.index({ isMasterOrder: 1, createdAt: -1 });
orderSchema.index({ masterOrderId: 1 });
orderSchema.index({ 'vendorSettlement.status': 1, vendorId: 1 });
orderSchema.index({ 'dispute.isDisputed': 1 });
orderSchema.index({ 'dispute.isDisputed': 1, updatedAt: -1 });

// ✅ HELPER METHOD: Calculate vendor settlement amount
orderSchema.methods.calculateVendorSettlement = function() {
  if (this.isMasterOrder || !this.vendorId) return;
  
  const commissionRate = this.vendorSettlement.platformCommissionRate || 0.03;
  const commission = this.total * commissionRate;
  const vendorAmount = this.total - commission;
  
  this.vendorSettlement.amount = vendorAmount;
  this.vendorSettlement.platformCommission = commission;
};

// ✅ HELPER METHOD: Mark as settled
orderSchema.methods.markAsSettled = function(transferRef, settledAt) {
  this.vendorSettlement.status = 'SETTLED';
  this.vendorSettlement.transferReference = transferRef;
  this.vendorSettlement.settledAt = settledAt || new Date();
  this.vendorSettlement.lastReconciledAt = new Date();
};

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
