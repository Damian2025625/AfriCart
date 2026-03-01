import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const CartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Index for faster queries
CartSchema.index({ customerId: 1 });

// ✅ IMPORTANT: Delete existing model if it exists to prevent caching issues
if (mongoose.models.Cart) {
  delete mongoose.models.Cart;
}

const Cart = mongoose.model('Cart', CartSchema);

export default Cart;