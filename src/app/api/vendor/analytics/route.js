import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import Review from "@/lib/mongodb/models/Review";
import Category from "@/lib/mongodb/models/Category";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function verifyToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function getDateRange(timeRange) {
  const now = new Date();
  let startDate;
  switch (timeRange) {
    case "daily":     startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); break;
    case "weekly":    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "monthly":   startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "quarterly": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    case "yearly":    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    default:          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate: now };
}

/**
 * Fetches all successful transactions for this subaccount.
 * 
 * KEY INSIGHT from Paystack API inspection:
 *   - t.fees_split.subaccount (in kobo) = what the vendor actually receives
 *   - This is AFTER Paystack fee AND platform commission are deducted by Paystack itself
 *   - So we MUST NOT re-deduct fees manually — just use fees_split.subaccount directly
 *   - If fees_split is a string (from metadata serialization), parse it
 * 
 * For multi-vendor metadata splits, we calculate the vendor's gross fraction then
 * apply the same fees_split ratio.
 */
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
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
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

  // Filter transactions belonging to this vendor
  const vendorTx = allTx.filter((t) => {
    if (t.subaccount && t.subaccount.subaccount_code === subaccountCode) return true;
    // Multi-vendor split via metadata
    if (t.metadata?.isMultiVendor && t.metadata?.vendorSplits) {
      try {
        const splits = JSON.parse(t.metadata.vendorSplits);
        return splits.some((s) => s.subaccount === subaccountCode);
      } catch { /* ignore */ }
    }
    return false;
  });

  return vendorTx.map((t) => {
    // ✅ PRIMARY: Use fees_split.subaccount (in kobo) — Paystack's definitive figure
    // This is exactly what the vendor will receive, already net of Paystack fee & platform share
    let vendorNetKobo = null;
    let feesSplit = t.fees_split;

    // fees_split may be serialised as a JSON string in some contexts
    if (typeof feesSplit === "string") {
      try { feesSplit = JSON.parse(feesSplit); } catch { feesSplit = null; }
    }

    if (feesSplit && typeof feesSplit.subaccount === "number") {
      vendorNetKobo = feesSplit.subaccount;
    }

    // FALLBACK for multi-vendor splits stored in our own metadata
    if (vendorNetKobo === null && t.metadata?.isMultiVendor && t.metadata?.vendorSplits) {
      try {
        const splits = JSON.parse(t.metadata.vendorSplits);
        const mySplit = splits.find((s) => s.subaccount === subaccountCode);
        if (mySplit) {
          // mySplit.share is basis points (10000 = 100%) of the gross amount
          const grossFraction = mySplit.share / 10000;
          const grossKobo = t.amount * grossFraction;
          // Derive vendor net using same fee ratio as fees_split on the full tx
          if (feesSplit) {
            const totalFeeRatio = (feesSplit.subaccount || 0) / (t.amount - (feesSplit.integration || 0));
            vendorNetKobo = grossKobo * totalFeeRatio;
          } else {
            // Last resort: just use the gross fraction (can't determine fees without fees_split)
            vendorNetKobo = grossKobo;
          }
        }
      } catch { /* ignore */ }
    }

    // ABSOLUTE FALLBACK: Use 97% of gross minus Paystack fee 
    // (only if fees_split is completely unavailable)
    if (vendorNetKobo === null) {
      const grossKobo = t.amount;
      const paystackFeeKobo = t.fees || 0;
      const platformShareKobo = Math.round(grossKobo * 0.03);
      vendorNetKobo = grossKobo - paystackFeeKobo - platformShareKobo;
    }

    // Derive fee components for display
    let paystackFeeKobo = t.fees || 0;
    let platformShareKobo = 0;
    if (feesSplit) {
      paystackFeeKobo = feesSplit.paystack || t.fees || 0;
      platformShareKobo = feesSplit.integration || 0;
    }

    return {
      id: t.id.toString(),
      reference: t.reference,
      grossNGN: t.amount / 100,
      vendorNet: vendorNetKobo / 100,       // ← ACCURATE from Paystack
      paystackFee: paystackFeeKobo / 100,
      platformShare: platformShareKobo / 100,
      status: t.status,
      channel: t.channel || "card",
      date: new Date(t.created_at),
    };
  });
}

/**
 * Fetch settlements for a vendor's subaccount.
 * 
 * KEY INSIGHT: GET /settlement?subaccount=CODE returns 0 records even when 
 * settlements exist! Instead, we must fetch ALL settlements and filter by 
 * the subaccount reference in the settlement object.
 * 
 * Correct fields: total_amount, effective_amount (not amount or net_amount)
 * Status lifecycle: pending → processing → success
 */
async function fetchVendorSettlements(subaccountCode) {
  let allSettlements = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    try {
      const res = await axios.get("https://api.paystack.co/settlement", {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        params: { perPage: 100, page },
      });

      const data = res.data?.data || [];
      allSettlements = allSettlements.concat(data);

      const meta = res.data?.meta;
      if (meta && meta.page < meta.pageCount) page++;
      else hasMore = false;
    } catch (err) {
      console.error("Paystack /settlement error:", err?.response?.data || err.message);
      hasMore = false;
    }
  }

  // Filter settlements that belong to this subaccount
  const vendorSettlements = allSettlements.filter((s) => {
    if (!s.subaccount) return false;
    return (
      s.subaccount.subaccount_code === subaccountCode ||
      s.subaccount === subaccountCode
    );
  });

  // Map to a clean shape
  // Paystack uses: total_amount (gross in kobo), effective_amount (net to bank in kobo)
  const settlements = vendorSettlements.map((s) => {
    const grossKobo = s.total_amount || 0;
    const netKobo = s.effective_amount || s.total_amount || 0;
    return {
      id: s.id.toString(),
      reference: `PST-${s.id}`,
      grossAmount: grossKobo / 100,
      amount: netKobo / 100,              // net amount sent to bank
      totalFees: s.total_fees ? s.total_fees / 100 : 0,
      totalProcessed: s.total_processed || 0,
      status: s.status,                  // pending | processing | success | failed
      date: s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : null,
      settlementDate: s.settlement_date
        ? new Date(s.settlement_date).toISOString().split("T")[0]
        : null,
      transactionCount: s.total_processed || 1,
    };
  });

  // totalSettled = funds that have been sent to bank (status: success)
  const totalSettled = settlements
    .filter((s) => s.status === "success")
    .reduce((sum, s) => sum + s.amount, 0);

  // totalPending = pending to be sent to bank (status: pending or processing)
  const totalPendingSettlement = settlements
    .filter((s) => s.status === "pending" || s.status === "processing")
    .reduce((sum, s) => sum + s.amount, 0);

  return { settlements, totalSettled, totalPendingSettlement };
}

export async function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "weekly";
    const { startDate, endDate } = getDateRange(timeRange);

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }

    const subaccountCode = vendor.paystackSubaccount?.subaccountCode;
    if (!subaccountCode) {
      return NextResponse.json({
        success: true,
        analytics: buildEmptyShell(vendor),
        dataSource: "paystack",
      });
    }

    const periodFrom = startDate.toISOString();
    const periodTo = endDate.toISOString();
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevFrom = new Date(startDate.getTime() - periodLength).toISOString();

    // ═════════════════════════════════════════════════════
    // 1. ALL-TIME transactions (for balance calculation)
    //    Period transactions (for revenue chart / metrics)
    // ═════════════════════════════════════════════════════
    const [allTimeTx, currentPeriodTx, prevPeriodTx] = await Promise.all([
      fetchVendorTransactions(subaccountCode),
      fetchVendorTransactions(subaccountCode, { from: periodFrom, to: periodTo }),
      fetchVendorTransactions(subaccountCode, { from: prevFrom, to: periodFrom }),
    ]);

    // ═════════════════════════════════════════════════════
    // 2. Settlements (all-time, fetched from main endpoint + filtered)
    //    Contains: totalSettled (success), totalPendingSettlement (pending/processing)
    // ═════════════════════════════════════════════════════
    const { settlements, totalSettled, totalPendingSettlement } =
      await fetchVendorSettlements(subaccountCode);

    // ═════════════════════════════════════════════════════
    // 3. Balance logic
    //
    //    totalEarned = sum of vendorNet from ALL successful transactions
    //    totalSettled = sum from settlements with status=success (sent to bank)
    //    pendingBalance = totalEarned - totalSettled
    //      (money Paystack is still holding, to be sent next business day)
    //
    //    The pendingSettlement from settlement API is also available, but 
    //    calculating from transactions is more accurate because settlement 
    //    records may appear slightly later.
    // ═════════════════════════════════════════════════════
    const totalEarned = allTimeTx.reduce((sum, t) => sum + t.vendorNet, 0);
    const pendingBalance = Math.max(totalEarned - totalSettled, 0);

    // ═════════════════════════════════════════════════════
    // 4. Period metrics
    // ═════════════════════════════════════════════════════
    const totalRevenue = currentPeriodTx.reduce((sum, t) => sum + t.vendorNet, 0);
    const previousRevenue = prevPeriodTx.reduce((sum, t) => sum + t.vendorNet, 0);
    const revenueChange = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    const totalOrders = currentPeriodTx.length;
    const previousOrderCount = prevPeriodTx.length;
    const ordersChange = previousOrderCount > 0
      ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100
      : totalOrders > 0 ? 100 : 0;

    // ═════════════════════════════════════════════════════
    // 5. Revenue chart (bucketed from Paystack tx by vendorNet)
    // ═════════════════════════════════════════════════════
    let chartStepCount;
    switch (timeRange) {
      case "daily":     chartStepCount = 24; break; // hourly
      case "monthly":   chartStepCount = 30; break;
      case "quarterly": chartStepCount = 12; break; // weekly
      case "yearly":    chartStepCount = 12; break; // monthly
      default:          chartStepCount = 7;
    }
    chartStepCount = Math.min(chartStepCount, 30);
    const msPerStep = periodLength / chartStepCount;

    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    const buckets = {};
    for (let i = 0; i < chartStepCount; i++) {
      const d = new Date(startDate.getTime() + i * msPerStep);
      const label = timeRange === "daily"
        ? `${d.getHours()}:00`
        : chartStepCount <= 7
        ? DAYS[d.getDay()]
        : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      buckets[label] = { revenue: 0, orders: 0, sortDate: d.getTime() };
    }

    currentPeriodTx.forEach((tx) => {
      const dt = tx.date.getTime();
      let idx = Math.max(0, Math.min(Math.floor((dt - startDate.getTime()) / msPerStep), chartStepCount - 1));
      const d = new Date(startDate.getTime() + idx * msPerStep);
      const label = timeRange === "daily"
        ? `${d.getHours()}:00`
        : chartStepCount <= 7
        ? DAYS[d.getDay()]
        : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      if (buckets[label]) {
        buckets[label].revenue += tx.vendorNet;
        buckets[label].orders += 1;
      }
    });

    const revenueData = Object.entries(buckets)
      .sort((a, b) => a[1].sortDate - b[1].sortDate)
      .map(([date, d]) => ({ date, revenue: parseFloat(d.revenue.toFixed(2)), orders: d.orders }));

    // ═════════════════════════════════════════════════════
    // 6. Local DB data: order status, top products, customers, reviews
    //    These aren't on Paystack — only our DB has them
    // ═════════════════════════════════════════════════════
    const localOrders = await Order.find({
      vendorId: vendor._id,
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate({
      path: "items.productId",
      populate: { path: "categoryId", model: "Category", select: "name" }
    });

    const categoryMap = {};
    let totalItemsSold = 0;
    localOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (o.orderStatus !== "CANCELLED") {
          const catName = item.productId?.categoryId?.name || "Uncategorized";
          categoryMap[catName] = (categoryMap[catName] || 0) + item.quantity;
          totalItemsSold += item.quantity;
        }
      });
    });

    const colors = ["#8B5CF6", "#10B981", "#F97316", "#3B82F6", "#EC4899", "#F59E0B", "#14B8A6", "#EAB308", "#A855F7"];
    const salesByCategory = Object.entries(categoryMap)
      .map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value);

    const productMap = {};
    localOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productId?._id?.toString() || item.name;
        if (!productMap[key]) productMap[key] = { name: item.name, sales: 0, revenue: 0 };
        productMap[key].sales += item.quantity;
        productMap[key].revenue += (item.price || 0) * item.quantity;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const custMap = {};
    localOrders.forEach((o) => {
      custMap[o.customerId.toString()] = (custMap[o.customerId.toString()] || 0) + 1;
    });
    const returningCustomers = Object.values(custMap).filter((c) => c > 1).length;

    const vendorProducts = await Product.find({ vendorId: vendor._id });
    const reviews = await Review.find({ productId: { $in: vendorProducts.map((p) => p._id) } });
    const averageRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    // ═════════════════════════════════════════════════════
    // 7. Settlement history display
    // ═════════════════════════════════════════════════════
    const recentSettlements = settlements.length > 0
      ? settlements
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .slice(0, 10)
          .map((s) => ({
            ...s,
            bankName: vendor.bankAccount?.bankName || "N/A",
            accountNumber: vendor.bankAccount?.accountNumber || "N/A",
          }))
      : [{
          id: "none",
          reference: "No payouts yet",
          amount: 0,
          status: "none",
          date: new Date().toISOString().split("T")[0],
          settlementDate: null,
          transactionCount: 0,
          bankName: vendor.bankAccount?.bankName || "N/A",
          accountNumber: vendor.bankAccount?.accountNumber || "N/A",
        }];

    // ═════════════════════════════════════════════════════
    // 8. Smart insights
    // ═════════════════════════════════════════════════════
    const smartInsights = [];
    if (pendingBalance > 0) {
      const nextBusinessDay = new Date();
      nextBusinessDay.setDate(nextBusinessDay.getDate() + (nextBusinessDay.getDay() === 5 ? 3 : nextBusinessDay.getDay() === 6 ? 2 : 1));
      smartInsights.push(`₦${pendingBalance.toFixed(2)} will be sent to your bank on the next business day (${nextBusinessDay.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}).`);
    }
    if (totalSettled > 0) {
      smartInsights.push(`₦${totalSettled.toFixed(2)} total has been settled to your ${vendor.bankAccount?.bankName || "bank"} account.`);
    }
    if (revenueChange > 10) {
      smartInsights.push(`Revenue up ${revenueChange.toFixed(1)}% vs the previous period!`);
    } else if (revenueChange < -10) {
      smartInsights.push(`Revenue down ${Math.abs(revenueChange).toFixed(1)}% vs previous period. Consider running promotions.`);
    }
    if (smartInsights.length === 0) {
      smartInsights.push("Make your first sale to start seeing insights here.");
    }

    const nextSettlementDate = new Date();
    if (nextSettlementDate.getDay() === 5) nextSettlementDate.setDate(nextSettlementDate.getDate() + 3);
    else if (nextSettlementDate.getDay() === 6) nextSettlementDate.setDate(nextSettlementDate.getDate() + 2);
    else nextSettlementDate.setDate(nextSettlementDate.getDate() + 1);

    const analytics = {
      overview: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        revenueChange: parseFloat(revenueChange.toFixed(2)),
        totalOrders,
        ordersChange: parseFloat(ordersChange.toFixed(2)),
        // All-time earnings (what vendor has earned net of all fees)
        ledgerBalance: parseFloat(totalEarned.toFixed(2)),
      },
      settlements: {
        // ← Money that Paystack has ALREADY sent to the bank (success settlements)
        totalSettled: parseFloat(totalSettled.toFixed(2)),
        // ← Money sitting in Paystack wallet, not yet sent to bank
        pendingBalance: parseFloat(pendingBalance.toFixed(2)),
        // pendingBalance from settlement records (may differ slightly — use tx-based as primary)
        settlementPending: parseFloat(totalPendingSettlement.toFixed(2)),
        // All-time vendor net earned (totalSettled + pendingBalance)
        ledgerBalance: parseFloat(totalEarned.toFixed(2)),
        settlementCount: settlements.filter((s) => s.status === "success").length,
        nextSettlementDate: nextSettlementDate.toISOString().split("T")[0],
        subaccountCode: vendor.paystackSubaccount?.subaccountCode,
        // Vendor receives (100 - percentage_charge)% after Paystack fees
        splitPercentage: 100 - (vendor.paystackSubaccount?.percentageCharge || 3),
        platformFee: vendor.paystackSubaccount?.percentageCharge || 3,
        bankName: vendor.bankAccount?.bankName,
        accountNumber: vendor.bankAccount?.accountNumber,
        accountName: vendor.bankAccount?.accountName,
        businessName: vendor.businessName,
      },
      salesByCategory,
      totalItemsSold,
      revenueData,
      topProducts,
      smartInsights,
      customerInsights: {
        totalCustomers: Object.keys(custMap).length,
        returningCustomers,
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews: reviews.length,
      },
      recentSettlements,
    };

    return NextResponse.json({
      success: true,
      analytics,
      timeRange,
      vendorId: vendor._id.toString(),
      vendorName: vendor.businessName,
      dataSource: "paystack",
    });
  } catch (error) {
    console.error("❌ Analytics error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

function buildEmptyShell(vendor) {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return {
    overview: { totalRevenue: 0, revenueChange: 0, totalOrders: 0, ordersChange: 0, ledgerBalance: 0 },
    settlements: {
      totalSettled: 0, pendingBalance: 0, settlementPending: 0, ledgerBalance: 0,
      settlementCount: 0, nextSettlementDate: next.toISOString().split("T")[0],
      subaccountCode: null, splitPercentage: 97, platformFee: 3,
      bankName: vendor.bankAccount?.bankName, accountNumber: vendor.bankAccount?.accountNumber,
      accountName: vendor.bankAccount?.accountName, businessName: vendor.businessName,
    },
    salesByCategory: [], totalItemsSold: 0, revenueData: [], topProducts: [],
    smartInsights: ["⚠️ No Paystack subaccount linked yet. Please complete vendor verification."],
    customerInsights: { totalCustomers: 0, returningCustomers: 0, averageRating: 0, totalReviews: 0 },
    recentSettlements: [{
      id: "none", reference: "Awaiting subaccount setup", amount: 0,
      status: "none", date: new Date().toISOString().split("T")[0], settlementDate: null,
      transactionCount: 0, bankName: vendor.bankAccount?.bankName || "N/A",
      accountNumber: vendor.bankAccount?.accountNumber || "N/A",
    }],
  };
}