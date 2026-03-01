import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function fetchPaystackBalance() {
  try {
    const response = await axios.get("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    if (response.data.status && response.data.data) {
      const ngn = response.data.data.find(b => b.currency === 'NGN');
      return ngn ? ngn.balance / 100 : 0;
    }
    return 0;
  } catch (error) {
    console.error("Paystack balance fetch error:", error);
    return 0;
  }
}

function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "ADMIN") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1. Live Wallet Balance (Contains Platform Commissions & Pending Transfers)
    const walletBalance = await fetchPaystackBalance();

    // 2. Fetch Automatic Payouts Pipeline (Vendor Subaccount Splits)
    const payouts = await Order.find({
      isMasterOrder: false,
      paymentStatus: "PAID",
      "vendorSettlement.subaccountCode": { $exists: true }
    })
    .sort({ createdAt: -1 })
    .populate("vendorId", "businessName")
    .limit(50);

    // 3. Aggregate Global Stats
    // We fetch all successful vendor settlements to calculate total volume and earnings
    const allPayouts = await Order.find({
        isMasterOrder: false,
        paymentStatus: "PAID",
        "vendorSettlement.subaccountCode": { $exists: true }
    }).select("vendorSettlement total");

    let totalVendorShare = 0;
    let totalPlatformCommission = 0;
    let pendingVolume = 0; // Volume still in T+1 window

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    allPayouts.forEach(order => {
        const s = order.vendorSettlement;
        totalVendorShare += s.amount || 0;
        totalPlatformCommission += s.platformCommission || 0;
        
        // If order is less than 24h old, it's likely still in "Pending Settlement"
        if (order.createdAt > twentyFourHoursAgo) {
            pendingVolume += s.amount || 0;
        }
    });

    // 4. Recent Inbound Master Orders
    const recentInbound = await Order.find({
      isMasterOrder: true,
      paymentStatus: "PAID"
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("customerId", "firstName lastName email");

    const stats = {
        walletBalance,
        totalVendorShare,
        totalPlatformCommission,
        pendingSettlement: pendingVolume,
        totalOrdersCount: allPayouts.length
    };

    return NextResponse.json({
      success: true,
      stats,
      payouts,
      recentInbound
    });
  } catch (error) {
    console.error("Admin payments error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
