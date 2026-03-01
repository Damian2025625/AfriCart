const axios = require("axios");
require("dotenv").config();

async function checkFeesSplit() {
  const res = await axios.get("https://api.paystack.co/transaction", {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    params: { status: "success", perPage: 10 },
  });
  const t = res.data.data[0];
  console.log("Original fields:");
  console.log("amount:", t.amount);
  console.log("fees:", t.fees);
  console.log("t.fees_split type:", typeof t.fees_split);
  console.log("t.fees_split object:", t.fees_split);
  
  let vendorNetKobo = null;
  let feesSplit = t.fees_split;

  if (typeof feesSplit === "string") {
    try { feesSplit = JSON.parse(feesSplit); } catch { feesSplit = null; }
  } else if (!feesSplit && t.fees_split) {
    feesSplit = t.fees_split;
  }

  if (feesSplit && typeof feesSplit.subaccount === "number") {
    vendorNetKobo = feesSplit.subaccount;
  }

  // ABSOLUTE FALLBACK
  if (vendorNetKobo === null) {
    console.log("Using absolute fallback");
    const grossKobo = t.amount;
    const paystackFeeKobo = t.fees || 0;
    const platformShareKobo = Math.round(grossKobo * 0.03);
    vendorNetKobo = grossKobo - paystackFeeKobo - platformShareKobo;
  }
  
  console.log("vendorNetKobo:", vendorNetKobo);
  
  return {
    id: t.id.toString(),
    reference: t.reference,
    grossNGN: t.amount / 100,
    vendorNet: vendorNetKobo / 100,       
    status: t.status,
    channel: t.channel || "card",
    date: new Date(t.created_at),
  };
}

checkFeesSplit().then(console.log).catch(console.error);
