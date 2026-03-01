import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/config";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import Category from '@/lib/mongodb/models/Category';
import Subcategory from '@/lib/mongodb/models/Subcategory';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Vendors only" },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    const vendor = await Vendor.findOne({ userId: decoded.userId });

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor not found" },
        { status: 404 }
      );
    }

    // Find product and ensure it belongs to this vendor
    const product = await Product.findOne({
      _id: id,
      vendorId: vendor._id,
    })
      .populate("categoryId", "name")
      .populate("subcategoryId", "name");

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // Transform product data
    const transformedProduct = {
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      categoryId: product.categoryId?._id?.toString(), // ✅ Add this
      subcategoryId: product.subcategoryId?._id?.toString(),
      category: product.categoryId ? { name: product.categoryId.name } : null,
      subcategory: product.subcategoryId
        ? { name: product.subcategoryId.name }
        : null,
      price: product.price,
      quantity: product.quantity,
      sku: product.sku,
      images: product.images,
      features: product.features,
      discountPercentage: product.discountPercentage,
      discountStartDate: product.discountStartDate,
      discountEndDate: product.discountEndDate,
      isActive: product.isActive,
      views: product.views,
      totalSold: product.totalSold,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json({
      success: true,
      product: transformedProduct,
      vendorId: vendor._id.toString(),
    });
  } catch (error) {
    console.error("Get product details error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}
