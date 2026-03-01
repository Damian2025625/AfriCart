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

async function checkCounts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const pCount = await db.collection('products').countDocuments();
  const rCount = await db.collection('reviews').countDocuments();
  console.log('Products:', pCount);
  console.log('Reviews:', rCount);
  await mongoose.disconnect();
}

checkCounts().catch(console.error);
