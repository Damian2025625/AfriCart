require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function testPaystack() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  console.log("Key starting with:", key ? key.substring(0, 7) : "none");
  
  const res = await axios.get("https://api.paystack.co/transaction", {
    headers: { Authorization: `Bearer ${key}` },
    params: { status: "success", perPage: 10 },
  });
  
  const txs = res.data.data;
  let output = `Found ${txs.length} transactions.\n`;
  if (txs.length > 0) {
    output += "Latest transaction:\n";
    output += `ID: ${txs[0].id}\n`;
    output += `Date: ${txs[0].created_at}\n`;
    output += `Subaccount: ${txs[0].subaccount ? txs[0].subaccount.subaccount_code : "null"}\n`;
    output += `Metadata: ${JSON.stringify(txs[0].metadata)}\n`;
    output += `Fees Split: ${JSON.stringify(txs[0].fees_split)}\n`;
  }
  fs.writeFileSync('scripts/paystack-tx.json', output);
}

testPaystack().catch(console.error);
