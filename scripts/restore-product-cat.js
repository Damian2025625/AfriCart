const mongoose = require('mongoose');
require('dotenv').config();

async function restore() {
  await mongoose.connect(process.env.MONGODB_URI);

  // The original categoryId that ALL 5 products had before we changed them
  const originalCategoryId = new mongoose.Types.ObjectId('695c543a45174e8dd3273ffc');

  const Product = mongoose.models.Product || mongoose.model(
    'Product',
    new mongoose.Schema({}, { strict: false, collection: 'products' })
  );

  const result = await Product.updateMany(
    {},
    { $set: { categoryId: originalCategoryId } }
  );

  console.log(`Restored ${result.modifiedCount} products back to original categoryId: 695c543a45174e8dd3273ffc`);
  process.exit(0);
}

restore().catch(console.error);
