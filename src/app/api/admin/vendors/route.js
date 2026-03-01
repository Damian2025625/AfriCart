import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import User from "@/lib/mongodb/models/User";
import Vendor from "@/lib/mongodb/models/Vendor";

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

// GET - List all vendors
export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const verified = searchParams.get("verified"); // "true" | "false" | ""

    const query = {};
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }
    if (verified === "true") query.isVerified = true;
    if (verified === "false") query.isVerified = false;

    const vendors = await Vendor.find(query)
      .populate("userId", "firstName lastName email phone isActive createdAt")
      .sort({ createdAt: -1 })
      .allowDiskUse(true)
      .lean();

    return NextResponse.json({ success: true, vendors, count: vendors.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Verify or suspend a vendor
export async function PATCH(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { vendorId, action } = await request.json(); // action: "verify" | "unverify" | "suspend" | "activate"

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });

    if (action === "verify") {
      vendor.isVerified = true;
      await vendor.save();
      return NextResponse.json({ success: true, message: "Vendor verified successfully" });
    }

    if (action === "unverify") {
      vendor.isVerified = false;
      await vendor.save();
      return NextResponse.json({ success: true, message: "Vendor verification removed" });
    }

    if (action === "suspend") {
      await User.findByIdAndUpdate(vendor.userId, { isActive: false });
      return NextResponse.json({ success: true, message: "Vendor account suspended" });
    }

    if (action === "activate") {
      await User.findByIdAndUpdate(vendor.userId, { isActive: true });
      return NextResponse.json({ success: true, message: "Vendor account activated" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
