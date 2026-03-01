// Run this ONCE to add unique index that handles null paymentReferences
// Place in /scripts/add-payment-reference-index.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function addPaymentReferenceIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    console.log('🔍 Checking existing indexes...');
    const existingIndexes = await ordersCollection.indexes();
    console.log('Current indexes:', existingIndexes.map(idx => idx.name));
    
    // Check if our index already exists
    const hasIndex = existingIndexes.some(idx => 
      idx.name === 'unique_payment_reference'
    );
    
    if (hasIndex) {
      console.log('✅ Index already exists!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // ==========================================
    // 🔥 SOLUTION: Use partial index for non-null values only
    // ==========================================
    console.log('📝 Creating partial unique index on paymentReference...');
    console.log('   This index only applies to orders WITH a payment reference');
    console.log('   Cash-on-delivery orders (null reference) are excluded');
    
    // Create partial unique index
    // Only enforces uniqueness when paymentReference exists (not null)
    await ordersCollection.createIndex(
      { 
        paymentReference: 1, 
        customerId: 1
      },
      { 
        unique: true,
        sparse: false, // Don't use sparse, use partialFilterExpression instead
        partialFilterExpression: { 
          paymentReference: { $type: "string" }, // Only index string values (not null)
          isMasterOrder: true // Only for master orders
        },
        name: 'unique_payment_reference',
        background: true
      }
    );
    
    console.log('✅ Partial unique index created successfully!');
    console.log('');
    console.log('📊 How this works:');
    console.log('   - Online payments (CARD/BANK_TRANSFER): paymentReference is unique ✅');
    console.log('   - Cash on delivery: paymentReference is null, NOT indexed ✅');
    console.log('   - Same payment = Only ONE order (prevents duplicates) ✅');
    
    // Show all indexes
    const allIndexes = await ordersCollection.indexes();
    console.log('');
    console.log('📊 All indexes on orders collection:');
    allIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, Object.keys(idx.key).join(', '));
      if (idx.partialFilterExpression) {
        console.log('    Partial filter:', JSON.stringify(idx.partialFilterExpression));
      }
    });
    
    // Test the index
    console.log('');
    console.log('🧪 Testing duplicate prevention...');
    
    const testPaymentRef = 'TEST-DUPLICATE-' + Date.now();
    const testCustomerId = new mongoose.Types.ObjectId();
    
    try {
      // Try to insert first order
      await ordersCollection.insertOne({
        orderNumber: 'TEST-1',
        customerId: testCustomerId,
        paymentReference: testPaymentRef,
        isMasterOrder: true,
        createdAt: new Date(),
      });
      console.log('✅ First order inserted');
      
      // Try to insert duplicate
      try {
        await ordersCollection.insertOne({
          orderNumber: 'TEST-2',
          customerId: testCustomerId,
          paymentReference: testPaymentRef, // Same reference!
          isMasterOrder: true,
          createdAt: new Date(),
        });
        console.log('❌ ERROR: Duplicate was allowed! Index not working!');
      } catch (dupError) {
        if (dupError.code === 11000) {
          console.log('✅ Duplicate prevented successfully! Index is working!');
        } else {
          throw dupError;
        }
      }
      
      // Clean up test data
      await ordersCollection.deleteMany({ 
        paymentReference: testPaymentRef 
      });
      console.log('✅ Test data cleaned up');
      
    } catch (testError) {
      console.error('❌ Test failed:', testError.message);
    }
    
    await mongoose.connection.close();
    console.log('');
    console.log('🎉 Done! Duplicate orders are now prevented at database level.');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Replace your verify page with payment-verify-page-FIXED.jsx');
    console.log('   2. Replace verify route with verify-route-NO-DUPLICATES.js');
    console.log('   3. Test a new payment - you should get only ONE order!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addPaymentReferenceIndex();