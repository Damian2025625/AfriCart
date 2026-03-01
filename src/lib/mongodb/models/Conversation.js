import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    lastMessage: {
      type: String,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ConversationSchema.index({ customerId: 1, vendorId: 1, productId: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ vendorId: 1, isPinned: 1 });

const Conversation = mongoose.models.Conversation || 
  mongoose.model('Conversation', ConversationSchema);

export default Conversation;