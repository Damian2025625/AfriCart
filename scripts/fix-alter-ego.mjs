import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const vendor = await Vendor.findOne({ businessName: /Alter Ego/i });
  if (vendor) {
    console.log(`Found: ${vendor.businessName}`);
    
    // Update Bank First
    vendor.bankAccount = {
      accountName: "Alter Ego",
      accountNumber: "8163293969",
      bankName: "Palmpay",
      bankCode: "999991",
    };
    await vendor.save();
    console.log("Updated bank info locally.");

    // Resolve Bank
    try {
      console.log(`Verifying Palmpay account...`);
      const verifyRes = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=8163293969&bank_code=999991`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      
      const resolvedName = verifyRes.data.data.account_name;
      console.log(`✅ Valid Account: ${resolvedName}`);

      // Create Subaccount
      console.log(`Creating Paystack subaccount...`);
      const response = await axios.post(
        'https://api.paystack.co/subaccount',
        {
          business_name: vendor.businessName,
          settlement_bank: "999991",
          account_number: "8163293969",
          percentage_charge: 3,
          description: `AfricArt vendor - ${vendor.businessName}`,
          primary_contact_email: "support@africart.com",
          primary_contact_name: resolvedName,
          primary_contact_phone: "",
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      const data = response.data.data;
      
      await Vendor.updateOne(
        { _id: vendor._id },
        {
          $set: {
            'bankAccount.accountName': resolvedName,
            'bankAccount.accountNumber': '8163293969',
            'bankAccount.bankName': 'Palmpay',
            'bankAccount.bankCode': '999991',
            isBankVerified: true,
            bankVerificationDate: new Date(),
            paystackSubaccount: {
              subaccountId: String(data.id),
              subaccountCode: data.subaccount_code,
              percentageCharge: 3,
              isActive: true,
              createdAt: new Date(),
            }
          }
        }
      );

      console.log(`✅ Successfully updated Alter Ego with the subaccount (${data.subaccount_code}) and verified status!`);

    } catch (e) {
      console.error("❌ Error:", e.response?.data?.message || e.message);
    }
  } else {
    console.log("❌ Could not find Alter Ego.");
  }
  process.exit(0);
}

run();
