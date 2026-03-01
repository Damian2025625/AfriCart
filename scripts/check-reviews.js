const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load .env
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

const Review = require('../src/lib/mongodb/models/Review').default;
const Product = require('../src/lib/mongodb/models/Product').default;

async function checkReviews() {
  await mongoose.connect(process.env.MONGODB_URI);
  const reviews = await Review.find().limit(10).populate('productId', 'name').lean();
  console.log('Total Reviews found:', reviews.length);
  reviews.forEach(r => {
    console.log(`Product: ${r.productId?.name} (${r.productId?._id}) - Rating: ${r.rating}`);
  });
  
  // Also check if products are in there
  const products = await Product.find({ isActive: true }).limit(8).select('name').lean();
  console.log('\n--- Active Products in Grid ---');
  products.forEach(p => {
    console.log(`- ${p.name} (${p._id})`);
  });
  
  await mongoose.disconnect();
}

checkReviews().catch(console.error);
