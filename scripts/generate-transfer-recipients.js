import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/lib/mongodb/config.js';
import Vendor from '../src/lib/mongodb/models/Vendor.js';
import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function setupTransferRecipients() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(' 💳 GENERATING PAYSTACK TRANSFER RECIPIENTS (ESCROW)');
  console.log('════════════════════════════════════════════════════════════\n');

  if (!PAYSTACK_SECRET_KEY) {
    console.error('❌ PAYSTACK_SECRET_KEY is required in .env.local');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const vendors = await Vendor.find({});
    console.log(`\n🔍 Found ${vendors.length} total vendors in the database.`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const vendor of vendors) {
      console.log(`\n▶️ Checking Vendor: ${vendor.businessName || vendor._id}`);

      // Check if they already have it
      if (vendor.bankAccount?.paystackRecipientCode) {
        console.log(`   ⏭️ Skipped: Already has recipient code (${vendor.bankAccount.paystackRecipientCode})`);
        skipCount++;
        continue;
      }

      // Check if they have valid bank details
      if (!vendor.bankAccount || !vendor.bankAccount.accountNumber || !vendor.bankAccount.bankCode) {
        console.log(`   ❌ Skipped: Missing bank account details in database.`);
        failCount++;
        continue;
      }

      try {
        console.log(`   🔄 Creating Transfer Recipient for "${vendor.bankAccount.accountName || vendor.businessName}"...`);
        const payload = {
          type: "nuban",
          name: vendor.bankAccount.accountName || vendor.businessName,
          account_number: vendor.bankAccount.accountNumber,
          bank_code: vendor.bankAccount.bankCode,
          currency: "NGN",
        };

        const response = await axios.post(
          "https://api.paystack.co/transferrecipient",
          payload,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.status && response.data?.data?.recipient_code) {
          const recipientCode = response.data.data.recipient_code;
          
          // Update vendor record
          await Vendor.findByIdAndUpdate(vendor._id, {
            $set: { "bankAccount.paystackRecipientCode": recipientCode },
          });

          console.log(`   ✅ Success! Created and saved recipient code: ${recipientCode}`);
          successCount++;
        } else {
          console.log(`   ❌ Failed: Paystack responded with success=false`);
          console.log(`      Reason: ${response.data?.message}`);
          failCount++;
        }
      } catch (err) {
        console.log(`   ❌ API Error: ${err.response?.data?.message || err.message}`);
        failCount++;
      }
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(' 🎉 COMPLETE — SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`  Total Evaluated:      ${vendors.length}`);
    console.log(`  Successfully Updated: ${successCount}`);
    console.log(`  Already Had Code:     ${skipCount}`);
    console.log(`  Failed/Skipped:       ${failCount}`);
    console.log('════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal script error:', error.message);
  } finally {
    process.exit(0);
  }
}

setupTransferRecipients();
