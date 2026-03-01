// ==========================================
// 🏦 GET ALL PAYSTACK BANK CODES
// ==========================================
// Run: node --env-file=.env scripts/paystack-bankcodes.js
//
// NOTE: Paystack uses the SAME CBN bank codes as Flutterwave
// (e.g. 044 = Access Bank, 057 = Zenith, 058 = GTBank)
// So your existing bankCode values in the DB are already compatible!

import axios from 'axios';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config({ path: '.env' });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function getAllBanks() {
  try {
    console.log('🔍 Fetching all banks from Paystack...\n');

    const response = await axios.get(
      'https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=250',
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.data.status) {
      console.error('❌ Failed to fetch banks:', response.data.message);
      process.exit(1);
    }

    const banks = response.data.data;
    console.log(`✅ Found ${banks.length} banks from Paystack\n`);

    // Highlight popular banks
    const popularCodes = ['044', '057', '058', '011', '033', '035', '070', '076', '082', '032', '068', '050'];
    const popular = banks.filter(b => popularCodes.includes(b.code));
    
    console.log('🏦 POPULAR BANKS (same codes as Flutterwave):');
    console.log('='.repeat(65));
    popular.forEach(bank => {
      console.log(`Code: ${String(bank.code).padEnd(12)} | Name: ${bank.name}`);
    });

    // Show fintechs
    const fintechs = banks.filter(bank =>
      bank.name.toLowerCase().includes('opay') ||
      bank.name.toLowerCase().includes('palmpay') ||
      bank.name.toLowerCase().includes('kuda') ||
      bank.name.toLowerCase().includes('moniepoint') ||
      bank.name.toLowerCase().includes('carbon') ||
      bank.name.toLowerCase().includes('fairmoney')
    );

    if (fintechs.length > 0) {
      console.log('\n📱 FINTECH / DIGITAL BANKS:');
      console.log('='.repeat(65));
      fintechs.forEach(bank => {
        console.log(`Code: ${String(bank.code).padEnd(12)} | Name: ${bank.name}`);
      });
    }

    console.log('\n🏦 ALL BANKS:');
    console.log('='.repeat(65));
    banks.forEach(bank => {
      console.log(`Code: ${String(bank.code).padEnd(12)} | Name: ${bank.name}`);
    });

    // Save to JSON file
    const formatted = banks.map(b => ({
      id: b.id,
      code: b.code,
      name: b.name,
      slug: b.slug,
      type: b.type,
      currency: b.currency,
      country: b.country,
    }));

    writeFileSync('paystack-banks.json', JSON.stringify(formatted, null, 2));
    console.log('\n✅ Full bank list saved to: paystack-banks.json');
    console.log('\n💡 NOTE: These codes are identical to Flutterwave CBN codes.');
    console.log('   Your existing bankCode field in the Vendor model works as-is!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

getAllBanks();
