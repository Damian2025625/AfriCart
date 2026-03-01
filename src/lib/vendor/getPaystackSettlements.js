import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function getVendorPaystackTransactions(subaccountCode, { startDate, endDate }) {
  if (!subaccountCode) return [];

  try {
    const from = startDate ? new Date(startDate).toISOString() : undefined;
    const to = endDate ? new Date(endDate).toISOString() : undefined;

    let allTransactions = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const response = await axios.get("https://api.paystack.co/transaction", {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
        params: {
          subaccount: subaccountCode,
          status: 'success',
          from,
          to,
          perPage: 100,
          page,
        },
      });

      if (response.data && response.data.data) {
        allTransactions = allTransactions.concat(response.data.data);
      }
      
      if (response.data.meta && response.data.meta.pageCount > page) {
        page++;
      } else {
        hasMore = false;
      }
    }

    return allTransactions;
  } catch (error) {
    console.error("❌ Paystack fetch transactions error:", error.response?.data || error.message);
    return [];
  }
}

export async function getVendorPaystackSettlements(subaccountCode, { startDate, endDate }) {
  if (!subaccountCode) return { settlements: [], totalSettled: 0 };

  try {
    const from = startDate ? new Date(startDate).toISOString() : undefined;
    const to = endDate ? new Date(endDate).toISOString() : undefined;

    let allSettlements = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const response = await axios.get("https://api.paystack.co/settlement", {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
        params: {
          subaccount: subaccountCode,
          from,
          to,
          perPage: 100,
          page,
        },
      });

      if (response.data && response.data.data) {
        allSettlements = allSettlements.concat(response.data.data);
      }
      
      if (response.data.meta && response.data.meta.pageCount > page) {
        page++;
      } else {
        hasMore = false;
      }
    }

    // Process and sort
    const processedSettlements = allSettlements.map((s) => ({
      id: s.id.toString(),
      amount: s.net_amount ? s.net_amount / 100 : s.amount / 100, // Handle Paystack's Kobo representation
      status: s.status,
      date: new Date(s.created_at).toISOString().split("T")[0],
      reference: s.settlement_date ? `ST-${new Date(s.settlement_date).getTime()}` : `ST-${s.id}`,
      settlementDate: s.settlement_date ? new Date(s.settlement_date).toISOString().split("T")[0] : null,
      transactionCount: s.transaction_count || 1,
    }));

    const totalSettled = processedSettlements
      .filter((s) => s.status === "success" || s.status === "successful" || s.status === "processed")
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      settlements: processedSettlements,
      totalSettled,
    };
  } catch (error) {
    console.error("❌ Paystack fetch settlements error:", error.response?.data || error.message);
    return { settlements: [], totalSettled: 0 };
  }
}
