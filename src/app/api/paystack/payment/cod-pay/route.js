import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import Vendor from "@/lib/mongodb/models/Vendor";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function verifyToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "Order number is required" },
        { status: 400 }
      );
    }

    // Find the master order
    const order = await Order.findOne({
      orderNumber,
      customerId: user.userId,
      isMasterOrder: true,
    }).populate({
      path: "subOrders",
      populate: {
        path: "vendorId",
        select: "businessName paystackSubaccount",
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    if (order.paymentMethod !== "CASH_ON_DELIVERY") {
      return NextResponse.json(
        { success: false, message: "This order is not a Cash on Delivery order" },
        { status: 400 }
      );
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { success: false, message: "This order has already been paid" },
        { status: 400 }
      );
    }

    // Prepare vendor data for Paystack metadata
    // We'll use the same structure as the checkout initialize route
    const vendorData = order.subOrders.map((subOrder) => {
      const vendor = subOrder.vendorId;
      return {
        vendorId: vendor._id.toString(),
        subaccountCode: vendor.paystackSubaccount?.subaccountCode,
        businessName: vendor.businessName,
        itemsTotal: subOrder.total, // Total for this sub-order (subtotal + fee - discount etc)
      };
    });

    const reference = `AFRI-COD-${orderNumber}-${Date.now()}`;

    // Paystack amount is in kobo (multiply by 100)
    const amountInKobo = Math.round(order.total * 100);

    const paystackData = {
      email: user.email,
      amount: amountInKobo,
      currency: "NGN",
      reference,
      channels: ["card", "bank", "ussd", "bank_transfer", "mobile_money", "qr"],
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/orders/${orderNumber}`, 
      metadata: {
        orderNumber: order.orderNumber,
        isCODPayment: true,
        customer_id: user.userId,
        vendorData: JSON.stringify(vendorData),
      },
    };

    console.log("🔄 Initializing Paystack COD payment for order:", orderNumber);

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      paystackData,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.status) {
      throw new Error(
        response.data.message || "Paystack initialization failed"
      );
    }

    // Update order with temporary payment reference for tracking
    // Note: We don't change paymentMethod to CARD, we keep it as COD but track the reference
    order.paymentReference = reference;
    await order.save();

    console.log("✅ Paystack COD payment initialized:", reference);

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      },
    });
  } catch (error) {
    console.error("❌ Paystack COD pay error:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
