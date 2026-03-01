const mongoose = require('mongoose');
require('dotenv').config();

async function reassign() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Product = mongoose.models.Product || mongoose.model(
    'Product',
    new mongoose.Schema({}, { strict: false, collection: 'products' })
  );

  // Reassign all 5 orphaned products to "Food & Beverages"
  const foodBeveragesId = new mongoose.Types.ObjectId('699c97fb07679a724712cbed');

  const result = await Product.updateMany(
    { categoryId: new mongoose.Types.ObjectId('695c543a45174e8dd3273ffc') },
    { $set: { categoryId: foodBeveragesId } }
  );

  console.log(`Updated ${result.modifiedCount} products to "Food & Beverages" (699c97fb07679a724712cbed)`);
  process.exit(0);
}

reassign().catch(console.error);
