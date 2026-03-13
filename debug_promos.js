const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://dami:Damian2025@africart.zuzof.mongodb.net/africart?retryWrites=true&w=majority&appName=africart';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected');

    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      activeSlashId: mongoose.Schema.Types.ObjectId,
      vendorId: mongoose.Schema.Types.ObjectId
    }), 'products');

    const CommunitySlash = mongoose.model('CommunitySlash', new mongoose.Schema({
      productId: mongoose.Schema.Types.ObjectId,
      vendorId: mongoose.Schema.Types.ObjectId,
      status: String
    }), 'communityslashes');

    const slashes = await CommunitySlash.find({});
    console.log('Total Slash Sessions:', slashes.length);
    slashes.forEach(s => console.log(`- Session ID: ${s._id}, Vendor: ${s.vendorId}, Product: ${s.productId}, Status: ${s.status}`));

    const productsWithSlash = await Product.find({ activeSlashId: { $exists: true, $ne: null } });
    console.log('Products with activeSlashId:', productsWithSlash.length);
    productsWithSlash.forEach(p => console.log(`- Product: ${p.name}, activeSlashId: ${p.activeSlashId}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
