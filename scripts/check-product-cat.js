const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ categoryId: mongoose.Schema.Types.ObjectId, isActive: Boolean }, { strict: false, collection: 'products' }));
  
  const products = await Product.find({});
  const byCat = {};
  for(let p of products) {
     const doc = p.toObject();
     const cId = String(doc.categoryId || 'none');
     byCat[cId] = (byCat[cId] || 0) + 1;
  }
  
  const activeProducts = await Product.find({ isActive: true });
  const activeByCat = {};
  for(let p of activeProducts) {
     const doc = p.toObject();
     const cId = String(doc.categoryId || 'none');
     activeByCat[cId] = (activeByCat[cId] || 0) + 1;
  }
  
  const fs = require('fs');
  fs.writeFileSync('scripts/cat-check.json', JSON.stringify({
    all: byCat,
    active: activeByCat
  }, null, 2));
  
  process.exit(0);
}

check().catch(console.error);
