// ==========================================
// 🔧 CREATE SUBACCOUNT FOR ALTER EGO VENDOR
// ==========================================
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// ==========================================
// Database Connection
// ==========================================
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ==========================================
// Vendor Model
// ==========================================
const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: String,
  businessAddress: String,
  businessPhone: String,
  description: String,
  categories: [String],
  country: String,
  state: String,
  city: String,
  logoUrl: String,
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    bankCode: String,
  },
  flutterwaveSubaccount: {
    subaccountId: String,
    subaccountCode: String,
    splitPercentage: { type: Number, default: 97 },
    isActive: { type: Boolean, default: false },
    createdAt: Date,
  },
  isBankVerified: { type: Boolean, default: false },
  bankVerificationDate: Date,
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

// ==========================================
// Config & Helpers
// ==========================================
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

async function verifyBankAccount(accountNumber, bankCode) {
  try {
    console.log(`🔍 Verifying account: ${accountNumber} (${bankCode})...`);
    
    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/accounts/resolve`,
      { account_number: accountNumber, account_bank: bankCode },
      { headers: { 'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
    );

    if (response.data.status === 'success') {
      return {
        success: true,
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
      };
    }
    return { success: false, message: response.data.message };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Verification failed',
    };
  }
}

async function createSubaccount(data) {
  try {
    const { businessName, accountNumber, bankCode, email, phone } = data;

    console.log('🔄 Requesting new subaccount from Flutterwave...');

    const response = await axios.post(
      `${FLUTTERWAVE_BASE_URL}/subaccounts`,
      {
        account_bank: bankCode,
        account_number: accountNumber,
        business_name: businessName,
        business_email: email,
        business_contact: phone || '',
        business_mobile: phone || '',
        country: 'NG',
        split_type: 'percentage',
        split_value: 0.03,  // ✅ FIXED: 0.03 represents 3% commission
      },
      { headers: { 'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
    );
    
    if (response.data.status === 'success') {
      return {
        success: true,
        subaccountId: response.data.data.id,
        subaccountCode: response.data.data.subaccount_id,
        bankCode: response.data.data.account_bank,
        accountNumber: response.data.data.account_number,
      };
    }
    
    throw new Error(response.data.message || 'Subaccount creation failed');
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

// ==========================================
// Main Function
// ==========================================
async function createAlterEgoSubaccount() {
  try {
    console.log('🚀 Starting Alter Ego Subaccount Setup...');
    await connectDB();

    // 1. Find Vendor
    const vendor = await Vendor.findOne({ businessName: 'Pizza Palace' });
    if (!vendor) {
      console.error('❌ Error: Vendor "Pizza Palace" not found in database.');
      process.exit(1);
    }
    console.log(`✅ Found Vendor: ${vendor.businessName} (${vendor._id})`);

    // 2. Check Existing
    if (vendor.flutterwaveSubaccount?.subaccountId) {
      console.log('⚠️  Warning: Vendor already has a subaccount.');
      console.log('   Continuing will UPDATE the database record but NOT delete the old one on FW.');
      console.log('   Waiting 5 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 3. Define Bank Details
    const bankDetails = {
      accountNumber: '2275632843',
      bankName: 'Zenith bank PLC',
      bankCode: '057',
      accountName: 'KENECHUKWU ANALIEFO NZEGWU',
    };

    // 4. Verify Bank
    const verification = await verifyBankAccount(bankDetails.accountNumber, bankDetails.bankCode);
    if (!verification.success) {
      console.error(`❌ Bank Verification Failed: ${verification.message}`);
      process.exit(1);
    }
    console.log(`✅ Bank Verified: ${verification.accountName}`);

    // 5. Create Subaccount
    const result = await createSubaccount({
      businessName: 'Pizza Palace',
      accountNumber: bankDetails.accountNumber,
      bankCode: bankDetails.bankCode,
      email: 'danzegwu@gmail.com',
      phone: vendor.businessPhone || '',
    });
    console.log(`✅ Subaccount Created: ${result.subaccountCode}`);

    // 6. Save to DB
    vendor.bankAccount = {
      accountName: verification.accountName,
      accountNumber: bankDetails.accountNumber,
      bankName: bankDetails.bankName,
      bankCode: bankDetails.bankCode,
    };

    vendor.flutterwaveSubaccount = {
      subaccountId: result.subaccountId,
      subaccountCode: result.subaccountCode,
      splitPercentage: 97, // Vendor gets 97%
      isActive: true,
      createdAt: new Date(),
    };

    vendor.isBankVerified = true;
    vendor.bankVerificationDate = new Date();

    await vendor.save();
    console.log('💾 Database updated successfully.');
    console.log('🎉 PROCESS COMPLETE');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR');
    console.error(error.message);
    process.exit(1);
  }
}

createAlterEgoSubaccount();