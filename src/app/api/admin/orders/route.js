import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";

function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "ADMIN") return null;
    return decoded;
  } catch { return null; }
}

export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const query = { isMasterOrder: true };
    if (status && status !== "ALL") query.orderStatus = status;
    if (search) query.orderNumber = { $regex: search, $options: "i" };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("customerId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .allowDiskUse(true)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
