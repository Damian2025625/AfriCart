import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import User from "@/lib/mongodb/models/User";
import Customer from "@/lib/mongodb/models/Customer";
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
    const search = searchParams.get("search") || "";

    const userQuery = { role: "CUSTOMER" };
    if (search) {
      userQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(userQuery).sort({ createdAt: -1 }).allowDiskUse(true).lean();

    // Get order count for each customer
    const customersWithStats = await Promise.all(
      users.map(async (u) => {
        const orderCount = await Order.countDocuments({ customerId: u._id, isMasterOrder: true });
        return { ...u, orderCount };
      })
    );

    return NextResponse.json({ success: true, customers: customersWithStats, count: customersWithStats.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { userId, action } = await request.json();

    const user = await User.findById(userId);
    if (!user || user.role !== "CUSTOMER") return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });

    if (action === "suspend") {
      user.isActive = false;
      await user.save();
      return NextResponse.json({ success: true, message: "Customer suspended" });
    }
    if (action === "activate") {
      user.isActive = true;
      await user.save();
      return NextResponse.json({ success: true, message: "Customer activated" });
    }
    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
