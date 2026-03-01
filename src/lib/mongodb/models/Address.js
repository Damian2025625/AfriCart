import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  label: {
    type: String,
    required: true,
    enum: ['HOME', 'WORK', 'OTHER'],
    default: 'HOME',
  },
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
  },
  additionalInfo: {
    type: String,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for faster queries
addressSchema.index({ customerId: 1 });

const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

export default Address;