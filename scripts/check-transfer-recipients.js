import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/lib/mongodb/config.js';
import Vendor from '../src/lib/mongodb/models/Vendor.js';

async function checkRecipients() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(' 🔍 VENDOR TRANSFER RECIPIENTS STATUS CHECKS');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    const vendors = await Vendor.find({});
    console.log(`Checking ${vendors.length} vendors...\n`);

    const hasCode = [];
    const missingCode = [];

    for (const vendor of vendors) {
      if (vendor.bankAccount?.paystackRecipientCode) {
        hasCode.push({
          name: vendor.businessName,
          code: vendor.bankAccount.paystackRecipientCode,
          accountName: vendor.bankAccount.accountName,
        });
      } else {
        missingCode.push({
          name: vendor.businessName,
          accountNumber: vendor.bankAccount?.accountNumber || 'Not set',
          bankCode: vendor.bankAccount?.bankCode || 'Not set',
        });
      }
    }

    console.log('────────────────────────────────────────────────────────────');
    console.log(`✅ HAS RECIPIENT CODE (${hasCode.length}):`);
    hasCode.forEach(v => {
      console.log(`   - ${v.name}`);
      console.log(`     Code: ${v.code}`);
      console.log(`     Acct: ${v.accountName}`);
    });

    console.log('\n────────────────────────────────────────────────────────────');
    console.log(`❌ MISSING RECIPIENT CODE (${missingCode.length}):`);
    
    if (missingCode.length === 0) {
      console.log("   (Everyone is ready for Escrow payouts!)");
    } else {
      missingCode.forEach(v => {
        console.log(`   - ${v.name}`);
        console.log(`     Missing bank details or failed API creation.`);
        console.log(`     Account No: ${v.accountNumber} | Bank: ${v.bankCode}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ Fatal script error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRecipients();
