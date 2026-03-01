import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import Customer from "@/lib/mongodb/models/Customer";

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
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    const now = new Date();
    let startDate = new Date();
    if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
    else if (timeRange === "30d") startDate.setDate(now.getDate() - 30);
    else if (timeRange === "90d") startDate.setDate(now.getDate() - 90);
    else if (timeRange === "12m") startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30);

    // 1. Revenue & Order Trend
    const revenueTrend = await Order.aggregate([
      {
        $match: {
          isMasterOrder: true,
          paymentStatus: "PAID",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2. Category Distribution
    const categoryDistribution = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 3. Top Vendors
    const topVendors = await Order.aggregate([
      {
        $match: {
          isMasterOrder: false,
          paymentStatus: "PAID",
        },
      },
      {
        $group: {
          _id: "$vendorId",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendorInfo",
        },
      },
      { $unwind: "$vendorInfo" },
      {
        $project: {
          name: "$vendorInfo.businessName",
          revenue: 1,
          orders: 1,
        },
      },
    ]);

    // 4. User Growth
    const vendorGrowth = await Vendor.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
    ]);

    const customerGrowth = await Customer.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        revenueTrend,
        categoryDistribution: categoryDistribution.map(c => ({
            name: c._id || "Uncategorized",
            value: c.count
        })),
        topVendors,
        growth: {
            vendors: vendorGrowth,
            customers: customerGrowth
        }
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
