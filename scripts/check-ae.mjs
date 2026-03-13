import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const v = await Vendor.findOne({ businessName: /Alter Ego/i }).lean();
  console.dir(v, { depth: null });
  process.exit(0);
}

run();
