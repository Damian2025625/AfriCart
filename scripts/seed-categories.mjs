/**
 * 📦 AfricArt - Category Seeder
 * 
 * This script populates the database with the initial set of product categories.
 * It uses ES modules and imports models directly.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Setup paths ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// ─── Load .env ────────────────────────────────────────────────────────────────
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split(/\r?\n/);
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const firstEq = trimmed.indexOf('=');
      const key = trimmed.substring(0, firstEq).trim();
      const value = trimmed.substring(firstEq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
  console.log('✅ .env loaded');
} else {
  console.log('⚠️  No .env file found, relying on system environment variables');
}

// ─── Import Model ─────────────────────────────────────────────────────────────
// We'll define the schema manually to avoid issues with Next.js environment during script execution
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

// ─── Categories to Seed ───────────────────────────────────────────────────────
const CATEGORIES = [
    "Fashion & Apparel",
    "Beauty & Personal Care",
    "Electronics & Gadgets",
    "Food & Beverages",
    "Agriculture & Farm Produce",
    "Health & Wellness",
    "Home & Furniture",
    "Arts, Crafts & Culture",
    "Books & Stationery",
    "Sports & Fitness",
    "Toys & Kids",
    "Automobile & Spare Parts",
    "Industrial & Construction",
    "Services",
    "Others / Miscellaneous",
];

async function seedCategories() {
  console.log('\n📦 AfricArt Category Seeder\n' + '─'.repeat(40));

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const name of CATEGORIES) {
      const existing = await Category.findOne({ name });
      if (existing) {
        console.log(`⚠️  Category "${name}" already exists. Skipping.`);
        skippedCount++;
      } else {
        await Category.create({ name });
        console.log(`✅ Category "${name}" added.`);
        addedCount++;
      }
    }

    console.log('\n' + '─'.repeat(40));
    console.log(`🎉 Seeding complete!`);
    console.log(`📊 Summary: ${addedCount} added, ${skippedCount} skipped.`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

seedCategories();
