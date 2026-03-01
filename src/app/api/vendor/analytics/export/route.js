import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Vendor from "@/lib/mongodb/models/Vendor";
import { generateFullAnalyticsPDF } from "@/lib/vendor/generateAnalyticsPDF";

const TIME_RANGES = ["daily", "weekly", "monthly", "quarterly", "yearly"];

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

export async function POST(request) {
  try {
    const user = verifyToken(request);

    if (!user || user.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Vendors only" },
        { status: 401 }
      );
    }

    await connectDB();

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const token = request.headers.get("authorization");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log(`📊 Generating full multi-period PDF for ${vendor.businessName}...`);

    // Fetch all 5 time ranges concurrently from the analytics API
    const results = await Promise.allSettled(
      TIME_RANGES.map((range) =>
        fetch(`${baseUrl}/api/vendor/analytics?timeRange=${range}`, {
          headers: { Authorization: token },
        }).then((r) => r.json())
      )
    );

    // Build a map of timeRange → analytics data
    const allPeriods = {};
    TIME_RANGES.forEach((range, i) => {
      const result = results[i];
      if (result.status === "fulfilled" && result.value?.success) {
        allPeriods[range] = result.value.analytics;
      } else {
        console.warn(`⚠️ Failed to fetch analytics for ${range}`);
        allPeriods[range] = null;
      }
    });

    // Generate the multi-section PDF
    const pdfBuffer = await generateFullAnalyticsPDF({ vendor, allPeriods });

    const dateStr = new Date().toISOString().split("T")[0];
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Africart-Analytics-${vendor.businessName.replace(/\s+/g, "-")}-${dateStr}.pdf"`,
      },
    });
  } catch (error) {
    console.error("❌ Export analytics error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export analytics", error: error.message },
      { status: 500 }
    );
  }
}