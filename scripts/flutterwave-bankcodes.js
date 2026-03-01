// ==========================================
// 🏦 GET ALL FLUTTERWAVE BANK CODES
// ==========================================
// Run this to see all available banks and their codes

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

async function getAllBanks() {
  try {
    console.log('🔍 Fetching all banks from Flutterwave...\n');

    const response = await axios.get(
      'https://api.flutterwave.com/v3/banks/NG',
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === 'success') {
      const banks = response.data.data;
      
      console.log(`✅ Found ${banks.length} banks\n`);

      // Filter for OPay, PalmPay, and other fintechs
      const fintechs = banks.filter(bank => 
        bank.name.toLowerCase().includes('opay') ||
        bank.name.toLowerCase().includes('palmpay') ||
        bank.name.toLowerCase().includes('kuda') ||
        bank.name.toLowerCase().includes('moniepoint')
      );

      console.log('🏦 FINTECH BANKS:');
      console.log('='.repeat(60));
      fintechs.forEach(bank => {
        console.log(`Name: ${bank.name.padEnd(30)} | Code: ${bank.code}`);
      });
      
      console.log('\n🏦 ALL BANKS:');
      console.log('='.repeat(60));
      banks.forEach(bank => {
        console.log(`Name: ${bank.name.padEnd(30)} | Code: ${bank.code}`);
      });

      // Save to JSON file for reference
      const fs = await import('fs');
      fs.writeFileSync(
        'flutterwave-banks.json', 
        JSON.stringify(banks, null, 2)
      );
      console.log('\n✅ Full bank list saved to: flutterwave-banks.json');

    } else {
      console.error('❌ Failed to fetch banks:', response.data);
    }

  } catch (error) {
    console.error('❌ Error fetching banks:', error.response?.data || error.message);
  }
}

getAllBanks();