/**
 * 🛡️ AfricArt - Auto-Release Escrow Job
 * 
 * Usage:
 *   node scripts/escrow-auto-release.js
 * 
 * Run this script daily (via cron or Vercel cron). 
 * It finds any "UPFRONT_SENT" sub-orders where the 3-day hold period has passed
 * and automatically releases the final 50% to the vendor.
 */

const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Mock schemas just enough for the script to run
const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const vendorSchema = new mongoose.Schema({}, { strict: false });
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

async function runAutoRelease() {
  console.log('\n=============================================');
  console.log('🛡️  AFRICART ESCROW AUTO-RELEASE JOB STARTING');
  console.log('=============================================');

  if (!MONGODB_URI || !PAYSTACK_SECRET_KEY) {
    console.error('❌ MONGODB_URI or PAYSTACK_SECRET_KEY not found');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const now = new Date();

  try {
    // Find all sub-orders where escrow is hanging and time is up
    const pendingOrders = await Order.find({
      isMasterOrder: false,
      'escrow.enabled': true,
      'escrow.status': 'UPFRONT_SENT',
      'escrow.autoReleaseAt': { $lte: now },
    });

    if (pendingOrders.length === 0) {
      console.log('👍 No pending escrows ready for auto-release today.');
      process.exit(0);
    }

    console.log(`📦 Found ${pendingOrders.length} orders ready for auto-release.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const subOrder of pendingOrders) {
      console.log(`▶️ Processing Order: ${subOrder.orderNumber}`);
      
      const vendorId = subOrder.vendorId;
      const vendor = await Vendor.findById(vendorId);

      if (!vendor || !vendor.bankAccount?.paystackRecipientCode) {
        console.warn(`   ⚠️ Vendor not found or missing recipient code. Skipping.`);
        failCount++;
        continue;
      }

      const heldAmount = subOrder.escrow.heldAmount;

      try {
        console.log(`   💸 Sending final ₦${heldAmount} to ${vendor.businessName || 'Vendor'}...`);
        
        // Transfer via Paystack
        const transferRes = await axios.post(
          "https://api.paystack.co/transfer",
          {
            source: "balance",
            amount: heldAmount * 100, // in kobo
            recipient: vendor.bankAccount.paystackRecipientCode,
            reason: `Auto-release final 50% for order ${subOrder.orderNumber}`,
          },
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (transferRes.data?.status) {
          subOrder.escrow.status = "RELEASED";
          subOrder.escrow.releaseReason = "AUTO_EXPIRED";
          subOrder.escrow.releasedAt = new Date();
          subOrder.escrow.finalTransferCode = transferRes.data.data.transfer_code;
          
          await subOrder.save();
          console.log(`   ✅ Success! Transfer code: ${transferRes.data.data.transfer_code}\n`);
          successCount++;
        } else {
          console.warn(`   ⚠️ Paystack error: ${transferRes.data?.message}\n`);
          failCount++;
        }
      } catch (err) {
        console.error(`   ❌ Failed to release:`, err.response?.data?.message || err.message, '\n');
        failCount++;
      }
    }

    console.log('=============================================');
    console.log(`🏁 JOB COMPLETE: ${successCount} released, ${failCount} failed.`);
    console.log('=============================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal Error running auto-release:', error);
    process.exit(1);
  }
}

runAutoRelease();
