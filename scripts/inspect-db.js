const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Product = mongoose.models.Product || mongoose.model(
    'Product',
    new mongoose.Schema({}, { strict: false, collection: 'products' })
  );
  const Category = mongoose.models.Category || mongoose.model(
    'Category',
    new mongoose.Schema({}, { strict: false, collection: 'categories' })
  );

  const cats = await Category.find({}).select('_id name isActive').lean();
  const prods = await Product.find({}).select('_id name categoryId isActive').lean();

  const result = {
    categories: cats.map(c => ({ id: c._id.toString(), name: c.name, isActive: c.isActive })),
    products: prods.map(p => ({ id: p._id.toString(), name: p.name, categoryId: p.categoryId ? p.categoryId.toString() : null, isActive: p.isActive }))
  };

  fs.writeFileSync('scripts/db-state.json', JSON.stringify(result, null, 2));
  console.log('Done. Written to scripts/db-state.json');
  process.exit(0);
}

inspect().catch(console.error);
