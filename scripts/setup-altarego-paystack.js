import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error('❌ PAYSTACK_SECRET_KEY is not set in .env');
  process.exit(1);
}

// ── Vendor details ──────────────────────────────────────────────────────────
const VENDOR_BUSINESS_NAME = 'Pizza Palace';
const BANK_DETAILS = {
  accountNumber: '2275632843',
  bankName:      'Zenith bank PLC',
  bankCode:      '057', // ✅ Correct Paystack code for PalmPay (100033 is Flutterwave's code)
};
// ───────────────────────────────────────────────────────────────────────────

// Inline Vendor Schema
const VendorSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: String,
  businessPhone: String,
  bankAccount: {
    accountName:   String,
    accountNumber: String,
    bankName:      String,
    bankCode:      String,
  },
  flutterwaveSubaccount: {
    subaccountId: String, subaccountCode: String,
    splitPercentage: Number, isActive: Boolean, createdAt: Date,
  },
  paystackSubaccount: {
    subaccountId: String, subaccountCode: String,
    percentageCharge: Number, isActive: Boolean, createdAt: Date,
  },
  isBankVerified: Boolean,
  bankVerificationDate: Date,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({ email: String, firstName: String, phone: String });

async function run() {
  console.log('═'.repeat(60));
  console.log(' 💳 PAYSTACK SUBACCOUNT SETUP — ALTER EGO');
  console.log('═'.repeat(60));

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected\n');

  const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
  const User   = mongoose.models.User   || mongoose.model('User', UserSchema);

  // Find the vendor
  const vendor = await Vendor.findOne({ businessName: new RegExp(VENDOR_BUSINESS_NAME, 'i') });
  if (!vendor) {
    console.error(`❌ Vendor "${VENDOR_BUSINESS_NAME}" not found in database.`);
    process.exit(1);
  }
  console.log(`✅ Found vendor: ${vendor.businessName} (${vendor._id})`);

  // Check if Paystack subaccount already exists
  if (vendor.paystackSubaccount?.subaccountCode) {
    console.log(`\n⚠️  Paystack subaccount already exists: ${vendor.paystackSubaccount.subaccountCode}`);
    console.log('   Continuing will OVERWRITE the existing record (old one stays on Paystack).');
    console.log('   Waiting 5 seconds... (Ctrl+C to cancel)\n');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Get vendor email from User model
  const user  = await User.findById(vendor.userId);
  const email = user?.email || 'vendor@africart.com';
  console.log(`📧 Using email: ${email}`);

  // ── Step 1: Resolve bank account ──────────────────────────────────────────
  console.log(`\n🔍 Resolving account ${BANK_DETAILS.accountNumber} at ${BANK_DETAILS.bankName} (${BANK_DETAILS.bankCode})...`);

  let resolvedName = BANK_DETAILS.accountNumber;
  try {
    const resolveRes = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${BANK_DETAILS.accountNumber}&bank_code=${BANK_DETAILS.bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (resolveRes.data.status) {
      resolvedName = resolveRes.data.data.account_name;
      console.log(`✅ Account resolved: ${resolvedName}`);
    } else {
      console.warn(`⚠️  Could not resolve account name: ${resolveRes.data.message}`);
      console.warn('   Continuing with business name as contact name...');
      resolvedName = VENDOR_BUSINESS_NAME;
    }
  } catch (err) {
    console.warn(`⚠️  Resolve request failed: ${err.response?.data?.message || err.message}`);
    console.warn('   Continuing anyway...');
    resolvedName = VENDOR_BUSINESS_NAME;
  }

  // ── Step 2: Create Paystack subaccount ────────────────────────────────────
  console.log(`\n🔄 Creating Paystack subaccount for "${VENDOR_BUSINESS_NAME}"...`);

  let subaccountData;
  try {
    const createRes = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name:         VENDOR_BUSINESS_NAME,
        settlement_bank:       BANK_DETAILS.bankCode,
        account_number:        BANK_DETAILS.accountNumber,
        percentage_charge:     3,   // Platform takes 3%, vendor gets 97%
        description:           `AfricArt vendor – ${VENDOR_BUSINESS_NAME}`,
        primary_contact_email: email,
        primary_contact_name:  resolvedName,
        primary_contact_phone: vendor.businessPhone || '',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!createRes.data.status) {
      console.error(`❌ Paystack error: ${createRes.data.message}`);
      process.exit(1);
    }

    subaccountData = createRes.data.data;
    console.log(`✅ Subaccount created!`);
    console.log(`   Code:   ${subaccountData.subaccount_code}`);
    console.log(`   ID:     ${subaccountData.id}`);
    console.log(`   Bank:   ${subaccountData.settlement_bank}`);
    console.log(`   Charge: ${subaccountData.percentage_charge}% (platform commission)`);

  } catch (err) {
    console.error(`❌ Failed to create subaccount: ${err.response?.data?.message || err.message}`);
    if (err.response?.data) console.error('   Details:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }

  // ── Step 3: Save to MongoDB ───────────────────────────────────────────────
  console.log('\n💾 Saving to database...');

  vendor.paystackSubaccount = {
    subaccountId:    String(subaccountData.id),
    subaccountCode:  subaccountData.subaccount_code,
    percentageCharge: subaccountData.percentage_charge || 3,
    isActive:        true,
    createdAt:       new Date(),
  };

  // Update bank account info
  vendor.bankAccount = {
    accountName:   resolvedName,
    accountNumber: BANK_DETAILS.accountNumber,
    bankName:      BANK_DETAILS.bankName,
    bankCode:      BANK_DETAILS.bankCode,
  };

  vendor.isBankVerified    = true;
  vendor.bankVerificationDate = new Date();

  await vendor.save();
  console.log('✅ Database updated!');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(' 🎉 COMPLETE — SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Vendor:          ${vendor.businessName}`);
  console.log(`  Account Name:    ${resolvedName}`);
  console.log(`  Account Number:  ${BANK_DETAILS.accountNumber}`);
  console.log(`  Bank:            ${BANK_DETAILS.bankName} (${BANK_DETAILS.bankCode})`);
  console.log(`  Subaccount Code: ${subaccountData.subaccount_code}`);
  console.log(`  Commission:      3% to platform, 97% to vendor`);
  console.log('═'.repeat(60));

  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ FATAL:', err.message);
  process.exit(1);
});
