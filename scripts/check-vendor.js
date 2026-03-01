require('dotenv').config();
const mongoose = require('mongoose');

async function checkVendor() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const VendorSchema = new mongoose.Schema({}, { strict: false, collection: 'vendors' });
  const VendorModel = mongoose.model('Vendor', VendorSchema);
  
  const vendors = await VendorModel.find({});
  let output = `Found ${vendors.length} vendors.\n`;
  for (const v of vendors) {
    const doc = v.toObject();
    output += `Vendor: ${doc.businessName}\n`;
    output += `Subaccount: ${doc.paystackSubaccount ? doc.paystackSubaccount.subaccountCode : "none"}\n`;
    output += `Role / ID: VENDOR / ${doc.userId}\n`;
    output += `---\n`;
  }
  require('fs').writeFileSync('scripts/vendor-check.json', output);
  process.exit(0);
}

checkVendor().catch(console.error);
