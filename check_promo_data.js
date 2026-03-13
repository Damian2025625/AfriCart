const mongoose = require('mongoose');
const path = require('path');

// Mocking required internal paths for the script
const MONGODB_URI = "mongodb+srv://dami:Damian2025@africart.zuzof.mongodb.net/africart?retryWrites=true&w=majority&appName=africart";

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const CommunitySlash = mongoose.model('CommunitySlash', new mongoose.Schema({
      productId: mongoose.Schema.Types.ObjectId,
      status: String
    }), 'communityslashes');

    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      activeSlashId: mongoose.Schema.Types.ObjectId
    }), 'products');

    const activeSlashes = await CommunitySlash.find({ status: 'PENDING' });
    console.log(`Found ${activeSlashes.length} active slash sessions.`);

    for (const slash of activeSlashes) {
      const product = await Product.findById(slash.productId);
      console.log(`- Product: ${product?.name} (ID: ${slash.productId})`);
      console.log(`  - activeSlashId in Product: ${product?.activeSlashId}`);
      if (!product?.activeSlashId) {
        console.log(`  [!] WARNING: activeSlashId is MISSING from Product document!`);
      } else if (product.activeSlashId.toString() !== slash._id.toString()) {
        console.log(`  [!] WARNING: activeSlashId MISMATCH! Product has ${product.activeSlashId}, Session is ${slash._id}`);
      } else {
        console.log(`  [OK] activeSlashId matches session.`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
