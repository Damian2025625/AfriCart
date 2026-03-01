import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

// Mongoose Models
import Order from './src/lib/mongodb/models/Order.js';
import User from './src/lib/mongodb/models/User.js';
import Vendor from './src/lib/mongodb/models/Vendor.js';

async function syncIndexes() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined');
    
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('Connected.');
    
    console.log('Syncing Order indexes...');
    await Order.syncIndexes();
    
    console.log('Syncing User indexes...');
    await User.syncIndexes();
    
    console.log('Syncing Vendor indexes...');
    await Vendor.syncIndexes();
    
    console.log('Successfully synced all indexes.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing indexes:', error);
    process.exit(1);
  }
}

syncIndexes();
