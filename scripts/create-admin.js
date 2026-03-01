/**
 * 🛡️ AfricArt - Create First Admin User
 * 
 * Usage:
 *   node scripts/create-admin.js
 * 
 * This script creates the very first admin account.
 * You only need to run this ONCE.
 * After that, admins can create more admins from the /dashboard/admin/settings page.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// ─── Load .env ────────────────────────────────────────────────────────────────
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
  console.log('✅ .env loaded');
} else {
  console.log('⚠️  No .env file found, relying on system environment variables');
}

// ─── ✏️  CONFIGURE YOUR ADMIN DETAILS HERE ───────────────────────────────────
const ADMIN_CONFIG = {
  firstName:  'Kenechukwu',
  lastName:   'Nzegwu',
  email:      'africart646@gmail.com',   // ← Change this to your email
  password:   'kad12min34',           // ← Change this to a strong password
  phone:      '08163293969',          // ← Change this to your phone
};
// ─────────────────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  phone:      { type: String, required: true },
  role:       { type: String, enum: ['CUSTOMER', 'VENDOR', 'ADMIN'], default: 'CUSTOMER' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
  console.log('\n🛡️  AfricArt Admin Creator\n' + '─'.repeat(40));

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Check if admin already exists
  const existing = await User.findOne({ email: ADMIN_CONFIG.email.toLowerCase() });
  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`⚠️  An admin with email "${ADMIN_CONFIG.email}" already exists!`);
      console.log('   To reset the password, run this script again with a different email,');
      console.log('   or update it directly in MongoDB Atlas.');
    } else {
      // Upgrade existing user to ADMIN
      existing.role = 'ADMIN';
      await existing.save();
      console.log(`✅ Existing user "${ADMIN_CONFIG.email}" has been upgraded to ADMIN role!`);
    }
    process.exit(0);
  }

  // Hash the password
  console.log('🔐 Hashing password...');
  const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 12);

  // Create the admin user
  const admin = await User.create({
    firstName: ADMIN_CONFIG.firstName,
    lastName:  ADMIN_CONFIG.lastName,
    email:     ADMIN_CONFIG.email.toLowerCase(),
    password:  hashedPassword,
    phone:     ADMIN_CONFIG.phone,
    role:      'ADMIN',
    isActive:  true,
  });

  console.log('\n🎉 Admin account created successfully!\n');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│  Name:     ${admin.firstName} ${admin.lastName}`);
  console.log(`│  Email:    ${admin.email}`);
  console.log(`│  Password: ${ADMIN_CONFIG.password}`);
  console.log(`│  Role:     ${admin.role}`);
  console.log('└─────────────────────────────────────────┘');
  console.log('\n👉 You can now log in at: /login');
  console.log('   After logging in, go to /dashboard/admin to access the admin panel.');
  console.log('\n🔒 IMPORTANT: Delete or change the password after your first login!\n');

  process.exit(0);
}

createAdmin().catch(err => {
  console.error('\n❌ Error creating admin:', err.message);
  process.exit(1);
});
