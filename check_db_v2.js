
import connectDB from './src/lib/mongodb/config.js';
import Product from './src/lib/mongodb/models/Product.js';
import Order from './src/lib/mongodb/models/Order.js';
import Customer from './src/lib/mongodb/models/Customer.js';
import Vendor from './src/lib/mongodb/models/Vendor.js';
import mongoose from 'mongoose';

async function checkCounts() {
    try {
        await connectDB();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        const customerCount = await Customer.countDocuments();
        const vendorCount = await Vendor.countDocuments();
        
        console.log('--- Collection Counts ---');
        console.log('Products:', productCount);
        console.log('Orders:', orderCount);
        console.log('Customers:', customerCount);
        console.log('Vendors:', vendorCount);
        
        // Check Featured Products Query performance
        const start = Date.now();
        const docs = await Product.find({ isActive: true }).limit(5).lean();
        console.log(`Simple query (isActive:true) took ${Date.now() - start}ms`);

        const explainStats = await Product.find({ isActive: true }).limit(5).explain('executionStats');
        console.log('--- Execution Stats for Featured ---');
        console.log('Strategy:', explainStats.queryPlanner.winningPlan.stage);
        console.log('Total Docs Examined:', explainStats.executionStats.totalDocsExamined);
        console.log('Execution Time (ms):', explainStats.executionStats.executionTimeMillis);

        process.exit(0);
    } catch (error) {
        console.error('Error during diagnostics:', error);
        process.exit(1);
    }
}

checkCounts();
