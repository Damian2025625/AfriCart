import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb/config";
import User from "@/lib/mongodb/models/User";

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

// GET - List all admin accounts
export async function GET(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const admins = await User.find({ role: "ADMIN" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, admins });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - Create a new admin account
export async function POST(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { firstName, lastName, email, password, phone } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const newAdmin = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: "ADMIN",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: `Admin account created for ${newAdmin.firstName} ${newAdmin.lastName}`,
      admin: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Deactivate or reactivate an admin account
export async function PATCH(request) {
  try {
    const admin = verifyAdmin(request);
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { targetUserId, action } = await request.json();

    // Prevent self-deactivation
    if (targetUserId === admin.userId) {
      return NextResponse.json(
        { success: false, message: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const targetAdmin = await User.findOne({ _id: targetUserId, role: "ADMIN" });
    if (!targetAdmin) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    if (action === "deactivate") {
      targetAdmin.isActive = false;
      await targetAdmin.save();
      return NextResponse.json({ success: true, message: "Admin account deactivated" });
    }

    if (action === "activate") {
      targetAdmin.isActive = true;
      await targetAdmin.save();
      return NextResponse.json({ success: true, message: "Admin account activated" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
