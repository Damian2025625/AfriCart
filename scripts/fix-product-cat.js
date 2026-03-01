const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ categoryId: mongoose.Schema.Types.ObjectId, isActive: Boolean }, { strict: false, collection: 'products' }));
  const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({}, { strict: false, collection: 'categories' }));
  
  const cats = await Category.find({});
  if (cats.length === 0) {
    console.log("No categories.");
    process.exit(0);
  }

  const products = await Product.find({ isActive: true });
  console.log(`Checking ${products.length} products...`);
  
  let fixedCount = 0;
  for (let p of products) {
    const doc = p.toObject();
    const cIdStr = String(doc.categoryId || 'none');
    
    // Check if cIdStr exists in cats
    const validCat = cats.find(c => c._id.toString() === cIdStr);
    
    if (!validCat) {
      // Reassign
      const randomCat = cats[Math.floor(Math.random() * cats.length)];
      await Product.updateOne({ _id: p._id }, { $set: { categoryId: randomCat._id } });
      console.log(`Fixed product ${p._id}: changed category from ${cIdStr} to ${randomCat._id.toString()}`);
      fixedCount++;
    }
  }
  console.log(`Finished. Fixed ${fixedCount} products.`);
  
  process.exit(0);
}

check().catch(console.error);
