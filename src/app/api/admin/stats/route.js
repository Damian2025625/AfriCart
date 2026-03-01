import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import User from "@/lib/mongodb/models/User";
import Vendor from "@/lib/mongodb/models/Vendor";
import Customer from "@/lib/mongodb/models/Customer";
import Order from "@/lib/mongodb/models/Order";
import Product from "@/lib/mongodb/models/Product";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Fetch live Paystack account balance
async function fetchPaystackBalance() {
  try {
    const response = await axios.get("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      timeout: 5000, // 5s timeout so it doesn't slow down the dashboard
    });
    if (response.data.status && response.data.data?.length > 0) {
      // Find NGN balance
      const ngnBalance = response.data.data.find((b) => b.currency === "NGN");
      return ngnBalance ? ngnBalance.balance / 100 : 0; // Convert kobo to naira
    }
    return null;
  } catch (error) {
    console.warn("⚠️ Could not fetch Paystack balance:", error.message);
    return null; // Don't crash the whole stats if Paystack is slow
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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Run all queries in parallel for performance (including live Paystack balance)
    const [
      totalVendors,
      newVendorsThisMonth,
      totalCustomers,
      newCustomersThisMonth,
      totalOrders,
      ordersThisMonth,
      ordersLastMonth,
      paidOrders,
      recentOrders,
      pendingVendors,
      totalProducts,
      paystackBalance, // 🔴 LIVE from Paystack API
    ] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ isMasterOrder: true }),
      Order.countDocuments({ isMasterOrder: true, createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ isMasterOrder: true, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Order.find({ isMasterOrder: true, paymentStatus: "PAID" }).select("total"),
      Order.find({ isMasterOrder: true })
        .sort({ createdAt: -1 })
        .allowDiskUse(true)
        .limit(8)
        .select("orderNumber orderStatus paymentStatus total createdAt customerId"),
      Vendor.countDocuments({ isVerified: false }),
      Product.countDocuments(),
      fetchPaystackBalance(), // runs alongside MongoDB, won't slow things down
    ]);

    // Total revenue from all paid orders
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const platformRevenue = totalRevenue * 0.03; // 3% commission

    // Revenue this month
    const paidOrdersThisMonth = await Order.find({
      isMasterOrder: true,
      paymentStatus: "PAID",
      createdAt: { $gte: startOfMonth },
    }).select("total");
    const revenueThisMonth = paidOrdersThisMonth.reduce((sum, o) => sum + (o.total || 0), 0);

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: { isMasterOrder: true } },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const statusMap = {};
    orderStatusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

    return NextResponse.json({
      success: true,
      stats: {
        vendors: { total: totalVendors, newThisMonth: newVendorsThisMonth, pending: pendingVendors },
        customers: { total: totalCustomers, newThisMonth: newCustomersThisMonth },
        orders: {
          total: totalOrders,
          thisMonth: ordersThisMonth,
          lastMonth: ordersLastMonth,
          statusBreakdown: statusMap,
        },
        revenue: {
          // ✅ Source: MongoDB orders (totals were written from Paystack verification responses)
          total: totalRevenue,
          platform: platformRevenue,
          thisMonth: revenueThisMonth,
          // ✅ Source: LIVE from Paystack Balance API right now
          paystackWalletBalance: paystackBalance,
          paystackBalanceFetched: paystackBalance !== null,
        },
        products: { total: totalProducts },
      },
      recentOrders,
      // Helps the frontend show a tooltip explaining data source
      dataSource: {
        revenue: "MongoDB (amounts sourced from Paystack payment verification)",
        paystackBalance: paystackBalance !== null ? "Live from Paystack API" : "Unavailable",
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
