import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixReviewIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('reviews');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes);

    // Drop the old problematic index
    try {
      await collection.dropIndex('productId_1_customerId_1_orderId_1');
      console.log('✅ Dropped old index: productId_1_customerId_1_orderId_1');
    } catch (error) {
      console.log('⚠️ Index might not exist:', error.message);
    }

    // Create new index
    await collection.createIndex(
      { productId: 1, customerId: 1 },
      { unique: true }
    );
    console.log('✅ Created new index: productId_1_customerId_1');

    // Verify new indexes
    const newIndexes = await collection.indexes();
    console.log('📋 New indexes:', newIndexes);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixReviewIndex();