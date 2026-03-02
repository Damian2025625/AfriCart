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
    .select('orderNumber total vendorSettlement createdAt vendorId')
    .sort({ createdAt: -1 })
    .populate("vendorId", "businessName")
    .limit(30) // Reduced from 50
    .lean();

    // Define twentyFourHoursAgo for use in aggregation
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 3. Aggregate Global Stats using MongoDB Pipeline (Better performance than .find().lean())
    const statsData = await Order.aggregate([
      {
        $match: {
          isMasterOrder: false,
          paymentStatus: "PAID",
          "vendorSettlement.subaccountCode": { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalVendorShare: { $sum: "$vendorSettlement.amount" },
          totalPlatformCommission: { $sum: "$vendorSettlement.platformCommission" },
          totalOrdersCount: { $sum: 1 },
          // Pending volume (in T+1 window - approx last 24h)
          pendingVolume: {
            $sum: {
              $cond: [
                { $gt: ["$createdAt", twentyFourHoursAgo] },
                "$vendorSettlement.amount",
                0
              ]
            }
          }
        }
      }
    ]);

    const s = statsData[0] || { totalVendorShare: 0, totalPlatformCommission: 0, pendingVolume: 0, totalOrdersCount: 0 };

    const stats = {
        walletBalance,
        totalVendorShare: s.totalVendorShare,
        totalPlatformCommission: s.totalPlatformCommission,
        pendingSettlement: s.pendingVolume,
        totalOrdersCount: s.totalOrdersCount
    };

    // 4. Recent Inbound Master Orders
    const recentInbound = await Order.find({
      isMasterOrder: true,
      paymentStatus: "PAID"
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("customerId", "firstName lastName email")
    .lean();

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
