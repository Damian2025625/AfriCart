import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessAddress: {
      type: String,
      required: true,
    },
    businessPhone: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    categories: {
      type: [String],
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
    },
    
    // ✅ NEW: Bank Account Information for Payments
    bankAccount: {
      accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
      },
      accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true,
        validate: {
          validator: function(v) {
            return /^\d{10}$/.test(v); // Nigerian bank accounts are 10 digits
          },
          message: 'Account number must be 10 digits'
        }
      },
      bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
      },
      bankCode: {
        type: String,
        required: [true, 'Bank code is required'],
        trim: true,
      },
      // Created via POST /transferrecipient — needed to send escrow payouts
      paystackRecipientCode: {
        type: String,
        default: null, // e.g. RCP_xxxxxxxx
      },
    },
    
    // ✅ NEW: Flutterwave Subaccount Information
    flutterwaveSubaccount: {
      subaccountId: {
        type: String,
        default: null,
      },
      subaccountCode: {
        type: String,
        default: null,
      },
      splitPercentage: {
        type: Number,
        default: 97, // Vendor gets 97%, platform gets 3%
        min: 0,
        max: 100,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },

    // ✅ NEW: Paystack Subaccount Information
    paystackSubaccount: {
      subaccountId: {
        type: String,
        default: null,
      },
      subaccountCode: {
        type: String,
        default: null,
      },
      percentageCharge: {
        type: Number,
        default: 3, // Platform takes 3%, vendor gets 97%
        min: 0,
        max: 100,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },
    
    // Existing fields
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // ✅ NEW: Bank Account Verification Status
    isBankVerified: {
      type: Boolean,
      default: false,
    },
    bankVerificationDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ✅ Index for faster queries
VendorSchema.index({ userId: 1 });
VendorSchema.index({ 'flutterwaveSubaccount.subaccountId': 1 });
VendorSchema.index({ 'paystackSubaccount.subaccountCode': 1 });
VendorSchema.index({ 'bankAccount.accountNumber': 1 });
VendorSchema.index({ createdAt: -1 });
VendorSchema.index({ isVerified: 1, createdAt: -1 });

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);