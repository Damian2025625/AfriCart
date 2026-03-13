/**
 * 🛠️ AfricArt - Vendor Paystack Subaccount Fixer (with Bank Verification)
 *
 * This script:
 *  1. Targets "K & S" vendor and updates their bank details
 *  2. Verifies each vendor's bank account via Paystack /bank/resolve
 *  3. Creates Paystack subaccounts for vendors that don't have one
 */

import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Setup paths ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// ─── Load .env ────────────────────────────────────────────────────────────────
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const firstEq = trimmed.indexOf('=');
      const key = trimmed.substring(0, firstEq).trim();
      const value = trimmed.substring(firstEq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
  console.log('✅ .env loaded');
}

// ─── Models ──────────────────────────────────────────────────────────────────
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({}, { strict: false, timestamps: true }));
const User   = mongoose.models.User   || mongoose.model('User',   new mongoose.Schema({}, { strict: false }));

// ─── Paystack Headers ─────────────────────────────────────────────────────────
const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

// ─── Bank Verification ────────────────────────────────────────────────────────
/**
 * Calls Paystack's /bank/resolve endpoint to verify an account number + bank code.
 * Returns { verified: true, resolvedName } on success, or { verified: false, reason } on failure.
 */
async function verifyBankAccount(accountNumber, bankCode) {
  try {
    const response = await axios.get('https://api.paystack.co/bank/resolve', {
      params: { account_number: accountNumber, bank_code: bankCode },
      headers: paystackHeaders(),
    });

    if (response.data.status && response.data.data?.account_name) {
      return {
        verified: true,
        resolvedName: response.data.data.account_name,
        resolvedNumber: response.data.data.account_number,
      };
    }

    return { verified: false, reason: 'Paystack returned no account name' };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    return { verified: false, reason: msg };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function fixVendors() {
  console.log('\n🚀 Starting Vendor Paystack Setup (with Bank Verification)\n' + '─'.repeat(50));

  if (!process.env.MONGODB_URI || !process.env.PAYSTACK_SECRET_KEY) {
    console.error('❌ Missing MONGODB_URI or PAYSTACK_SECRET_KEY in .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Step 1: Fix "Alter Ego" bank details ──────────────────────────────────────
    console.log('🔍 Looking for "Alter Ego" vendor...');

    // Try multiple name variations + phone number fallback
    let ksVendor = await Vendor.findOne({ businessName: /alter ego/i })
                ?? await Vendor.findOne({ businessPhone: /8163293969/ })
                ?? await Vendor.findOne({ 'bankAccount.accountNumber': '8163293969' });

    if (ksVendor) {
      console.log(`✅ Found: "${ksVendor.businessName}" (ID: ${ksVendor._id})`);
      console.log('🔄 Updating bank details to Palmpay...');
      
      await Vendor.updateOne(
        { _id: ksVendor._id },
        {
          $set: {
            'bankAccount.accountName': ksVendor.bankAccount?.accountName || 'Alter Ego',
            'bankAccount.accountNumber': '8163293969',
            'bankAccount.bankName': 'Palmpay',
            'bankAccount.bankCode': '999991',
          }
        }
      );
      
      console.log('✅ Bank details updated.\n');
    } else {
      console.log('⚠️  "Alter Ego" not found by name or phone. Skipping that specific fix.\n');
    }

    // ── Step 2: Find all vendors missing a subaccount ────────────────────────
    const vendorsToFix = await Vendor.find({
      $or: [
        { 'paystackSubaccount.subaccountCode': { $exists: false } },
        { 'paystackSubaccount.subaccountCode': null },
        { 'paystackSubaccount.subaccountCode': '' },
      ],
    });

    console.log(`🔍 Found ${vendorsToFix.length} vendor(s) needing Paystack subaccounts.\n`);

    let successCount = 0;
    let failCount    = 0;

    for (const vendor of vendorsToFix) {
      console.log(`📦 Processing: ${vendor.businessName}`);

      // ── Guard: must have bank details ──
      if (!vendor.bankAccount?.accountNumber || !vendor.bankAccount?.bankCode) {
        console.log('   ⚠️  Missing bank details. Skipping.\n');
        failCount++;
        continue;
      }

      // ── Step 2a: Verify bank account with Paystack ────────────────────────
      console.log(`   🔎 Verifying account ${vendor.bankAccount.accountNumber} (${vendor.bankAccount.bankName})...`);
      const verification = await verifyBankAccount(
        vendor.bankAccount.accountNumber,
        vendor.bankAccount.bankCode,
      );

      if (!verification.verified) {
        console.log(`   ❌ Bank verification failed: ${verification.reason}`);
        console.log('   ⏭️  Skipping subaccount creation for unverified account.\n');

        // Mark as unverified in DB
        await Vendor.updateOne(
          { _id: vendor._id },
          { 
            $set: { 
              isBankVerified: false,
              bankVerificationDate: new Date() 
            } 
          }
        );
        
        failCount++;
        continue;
      }

      console.log(`   ✅ Bank verified! Resolved name: "${verification.resolvedName}"`);

      // We will perform the update in Step 2b if subaccount creation succeeds

      // ── Step 2b: Create Paystack subaccount ──────────────────────────────
      const user  = await User.findById(vendor.userId);
      const email = user?.email || 'support@africart.com';
      const phone = user?.phone || vendor.businessPhone || '';

      try {
        console.log('   🔄 Creating Paystack subaccount...');

        const response = await axios.post(
          'https://api.paystack.co/subaccount',
          {
            business_name:         vendor.businessName,
            settlement_bank:       vendor.bankAccount.bankCode,
            account_number:        vendor.bankAccount.accountNumber,
            percentage_charge:     3,
            description:           `AfricArt vendor - ${vendor.businessName}`,
            primary_contact_email: email,
            primary_contact_name:  vendor.bankAccount.accountName || vendor.businessName,
            primary_contact_phone: phone,
          },
          { headers: paystackHeaders() },
        );

        if (response.data.status) {
          const data = response.data.data;
          
          const updateData = {
            paystackSubaccount: {
              subaccountId:     String(data.id),
              subaccountCode:   data.subaccount_code,
              percentageCharge: 3,
              isActive:         true,
              createdAt:        new Date(),
            },
            isBankVerified: true,
            bankVerificationDate: new Date()
          };

          if (verification.resolvedName) {
            updateData['bankAccount.accountName'] = verification.resolvedName;
          }

          await Vendor.updateOne(
            { _id: vendor._id },
            { $set: updateData }
          );

          console.log(`   ✅ Subaccount created: ${data.subaccount_code}\n`);
          successCount++;
        } else {
          throw new Error(response.data.message || 'Unknown Paystack error');
        }
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error(`   ❌ Subaccount creation failed: ${msg}`);
        if (msg.includes('already has a subaccount') || msg.includes('duplicate')) {
          console.log('   💡 This account may already have a subaccount on Paystack — check your Paystack dashboard.');
        }
        
        // Still save the verified bank status
        await Vendor.updateOne(
          { _id: vendor._id },
          { 
            $set: { 
              isBankVerified: true,
              bankVerificationDate: new Date(),
              'bankAccount.accountName': verification.resolvedName || vendor.bankAccount?.accountName
            } 
          }
        );
        
        failCount++;
        console.log();
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('─'.repeat(50));
    console.log('📊 Process Complete!');
    console.log(`   ✅ Success: ${successCount} vendor(s)`);
    console.log(`   ❌ Failed / Skipped: ${failCount} vendor(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Critical Error:', error);
    process.exit(1);
  }
}

fixVendors();