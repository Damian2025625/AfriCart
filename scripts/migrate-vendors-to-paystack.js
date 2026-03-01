// ==========================================
// 🔄 MIGRATE EXISTING VENDORS TO PAYSTACK
// ==========================================
// This script reads all vendors in MongoDB who have bank account details
// and creates a Paystack subaccount for each one, saving the result back
// to the vendor's paystackSubaccount field.
//
// Run: node --env-file=.env scripts/migrate-vendors-to-paystack.js
//
// Options (edit the CONFIG block below before running):
//   DRY_RUN = true  => Just list vendors, do NOT call Paystack or write to DB
//   DRY_RUN = false => Actually create subaccounts and save to DB
//
// ==========================================

import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// ── CONFIG ─────────────────────────────────────────────────────────────────
const DRY_RUN = false;               // Set true to preview without making changes
const DELAY_MS = 1200;              // Delay between API calls to avoid rate limiting
const SKIP_IF_ALREADY_EXISTS = true; // Skip vendors who already have paystackSubaccount
// ───────────────────────────────────────────────────────────────────────────

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  console.error('❌ PAYSTACK_SECRET_KEY is not set in .env');
  process.exit(1);
}

// ==========================================
// DB Connection
// ==========================================
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// ==========================================
// Inline Vendor Schema (avoids Next.js model conflicts)
// ==========================================
const VendorSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName:    String,
  businessAddress: String,
  businessPhone:   String,
  description:     String,
  categories:      [String],
  country:         String,
  state:           String,
  city:            String,
  logoUrl:         String,
  bankAccount: {
    accountName:   String,
    accountNumber: String,
    bankName:      String,
    bankCode:      String,
  },
  flutterwaveSubaccount: {
    subaccountId:    String,
    subaccountCode:  String,
    splitPercentage: { type: Number, default: 97 },
    isActive:        { type: Boolean, default: false },
    createdAt:       Date,
  },
  paystackSubaccount: {
    subaccountId:    String,
    subaccountCode:  String,
    percentageCharge:{ type: Number, default: 3 },
    isActive:        { type: Boolean, default: false },
    createdAt:       Date,
  },
  isBankVerified:      { type: Boolean, default: false },
  bankVerificationDate: Date,
  rating:              { type: Number, default: 0 },
  totalRatings:        { type: Number, default: 0 },
  isVerified:          { type: Boolean, default: false },
}, { timestamps: true });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

// Also need User emails for subaccount creation
const UserSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  phone: String,
  role: String,
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ==========================================
// Paystack Helpers
// ==========================================
async function resolveAccount(accountNumber, bankCode) {
  try {
    const res = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    if (res.data.status) {
      return { success: true, accountName: res.data.data.account_name };
    }
    return { success: false, message: res.data.message };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
}

async function createPaystackSubaccount({ businessName, accountNumber, bankCode, email, phone, contactName }) {
  try {
    const res = await axios.post(
      `${PAYSTACK_BASE_URL}/subaccount`,
      {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 3, // Platform takes 3%
        description: `AfricArt vendor – ${businessName}`,
        primary_contact_email: email,
        primary_contact_name: contactName || businessName,
        primary_contact_phone: phone || '',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (res.data.status) {
      return {
        success: true,
        subaccountId:   String(res.data.data.id),
        subaccountCode: res.data.data.subaccount_code,
        settlementBank: res.data.data.settlement_bank,
        percentageCharge: res.data.data.percentage_charge,
      };
    }
    return { success: false, message: res.data.message };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// Main Migration
// ==========================================
async function migrateVendors() {
  console.log('═'.repeat(60));
  console.log(' 🔄 PAYSTACK VENDOR MIGRATION SCRIPT');
  console.log('═'.repeat(60));
  console.log(`  Mode:  ${DRY_RUN ? '🟡 DRY RUN (no changes will be made)' : '🟢 LIVE (will create subaccounts + save to DB)'}`);
  console.log(`  Skip existing: ${SKIP_IF_ALREADY_EXISTS}`);
  console.log('═'.repeat(60) + '\n');

  await connectDB();

  // Get all vendors with bank account details
  const vendors = await Vendor.find({
    'bankAccount.accountNumber': { $exists: true, $ne: null, $ne: '' },
    'bankAccount.bankCode':      { $exists: true, $ne: null, $ne: '' },
  }).lean();

  if (vendors.length === 0) {
    console.log('⚠️  No vendors with bank account details found.');
    process.exit(0);
  }

  console.log(`📋 Found ${vendors.length} vendor(s) with bank account details.\n`);

  const results = {
    success: [],
    skipped: [],
    failed:  [],
  };

  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const num = `[${i + 1}/${vendors.length}]`;

    console.log(`\n${'─'.repeat(55)}`);
    console.log(`${num} Vendor: ${v.businessName}`);
    console.log(`    DB ID:  ${v._id}`);
    console.log(`    Bank:   ${v.bankAccount.bankName || 'N/A'} (code: ${v.bankAccount.bankCode})`);
    console.log(`    Acct:   ${v.bankAccount.accountNumber} — ${v.bankAccount.accountName || 'unverified'}`);

    // Skip check
    if (SKIP_IF_ALREADY_EXISTS && v.paystackSubaccount?.subaccountCode) {
      console.log(`    ✅ Already has Paystack subaccount: ${v.paystackSubaccount.subaccountCode} — SKIPPED`);
      results.skipped.push({ name: v.businessName, code: v.paystackSubaccount.subaccountCode });
      continue;
    }

    if (DRY_RUN) {
      console.log('    🟡 [DRY RUN] Would create subaccount here.');
      results.skipped.push({ name: v.businessName, reason: 'dry run' });
      continue;
    }

    // Get vendor's user email
    const user = await User.findById(v.userId).lean();
    const email = user?.email || `vendor_${v._id}@africart.com`;

    // Step 1: Resolve bank account name
    console.log('    🔍 Resolving bank account...');
    const resolved = await resolveAccount(v.bankAccount.accountNumber, v.bankAccount.bankCode);

    if (!resolved.success) {
      console.log(`    ❌ Account resolve failed: ${resolved.message}`);
      results.failed.push({ name: v.businessName, error: `Resolve: ${resolved.message}` });
      await sleep(DELAY_MS);
      continue;
    }
    console.log(`    ✅ Resolved: ${resolved.accountName}`);

    // Step 2: Create Paystack subaccount
    console.log('    🔄 Creating Paystack subaccount...');
    const created = await createPaystackSubaccount({
      businessName: v.businessName,
      accountNumber: v.bankAccount.accountNumber,
      bankCode: v.bankAccount.bankCode,
      email,
      phone: v.businessPhone || '',
      contactName: resolved.accountName,
    });

    if (!created.success) {
      console.log(`    ❌ Subaccount creation failed: ${created.message}`);
      results.failed.push({ name: v.businessName, error: `Create: ${created.message}` });
      await sleep(DELAY_MS);
      continue;
    }
    console.log(`    ✅ Created: ${created.subaccountCode}`);

    // Step 3: Save to DB
    await Vendor.findByIdAndUpdate(v._id, {
      $set: {
        'paystackSubaccount.subaccountId':    created.subaccountId,
        'paystackSubaccount.subaccountCode':  created.subaccountCode,
        'paystackSubaccount.percentageCharge': created.percentageCharge || 3,
        'paystackSubaccount.isActive':        true,
        'paystackSubaccount.createdAt':       new Date(),
        'bankAccount.accountName':            resolved.accountName,
        isBankVerified:                       true,
        bankVerificationDate:                 new Date(),
      },
    });
    console.log('    💾 Saved to database.');

    results.success.push({ name: v.businessName, code: created.subaccountCode });

    await sleep(DELAY_MS); // Respect API rate limits
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(' 📊 MIGRATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Success:  ${results.success.length}`);
  console.log(`  ⏭️  Skipped:  ${results.skipped.length}`);
  console.log(`  ❌ Failed:   ${results.failed.length}`);

  if (results.success.length > 0) {
    console.log('\n  ✅ Successfully created:');
    results.success.forEach(r => console.log(`     • ${r.name} → ${r.code}`));
  }

  if (results.failed.length > 0) {
    console.log('\n  ❌ Failed:');
    results.failed.forEach(r => console.log(`     • ${r.name}: ${r.error}`));
    console.log('\n  👆 Fix the failed vendors manually or re-run the script.');
  }

  if (DRY_RUN) {
    console.log('\n  🟡 This was a DRY RUN. Set DRY_RUN = false to actually migrate.');
  }

  console.log('═'.repeat(60));
  process.exit(0);
}

migrateVendors().catch(err => {
  console.error('\n❌ FATAL ERROR:', err.message);
  process.exit(1);
});
