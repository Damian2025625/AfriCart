const axios = require("axios");
require("dotenv").config();

async function fetchVendorTransactions(subaccountCode, { from, to } = {}) {
  const params = { status: "success", perPage: 100 };
  if (from) params.from = from;
  if (to) params.to = to;

  let allTx = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    try {
      const res = await axios.get("https://api.paystack.co/transaction", {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        params: { ...params, page },
      });

      const data = res.data?.data || [];
      allTx = allTx.concat(data);

      const meta = res.data?.meta;
      if (meta && meta.page < meta.pageCount) page++;
      else hasMore = false;
    } catch (err) {
      console.error("Paystack /transaction error:", err?.response?.data || err.message);
      hasMore = false;
    }
  }
  
  console.log(`from: ${from}, to: ${to} -> fetched ${allTx.length} from paystack`);

  const vendorTx = allTx.filter((t) => {
    if (t.subaccount && t.subaccount.subaccount_code === subaccountCode) return true;
    if (t.metadata?.isMultiVendor && t.metadata?.vendorSplits) {
      try {
        const splits = typeof t.metadata.vendorSplits === 'string' ? JSON.parse(t.metadata.vendorSplits) : t.metadata.vendorSplits;
        return splits.some((s) => s.subaccount === subaccountCode);
      } catch { /* ignore */ }
    }
    return false;
  });

  return vendorTx;
}

async function test() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const subaccountCode = "ACCT_dgwsban3uq49s4n"; // Pizza Palace
  
  const txs = await fetchVendorTransactions(subaccountCode, { 
    from: startDate.toISOString(), 
    to: endDate.toISOString() 
  });
  
  console.log(`Found ${txs.length} transactions for ${subaccountCode}.`);
}

test().catch(console.error);
