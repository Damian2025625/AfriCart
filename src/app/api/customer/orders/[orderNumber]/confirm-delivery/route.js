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

export async function PATCH(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { orderNumber } = await params;

    // Find the Master Order
    const masterOrder = await Order.findOne({
      orderNumber: orderNumber,
      customerId: user.userId,
      isMasterOrder: true,
    });

    if (!masterOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    if (masterOrder.orderStatus === "DELIVERED") {
      return NextResponse.json({ success: false, message: "Order is already delivered" }, { status: 400 });
    }

    // Process all sub-orders related to this master order using its _id
    const subOrders = await Order.find({ masterOrderId: masterOrder._id }).populate("vendorId");

    for (const subOrder of subOrders) {
      // 1. Mark sub-order as delivered
      subOrder.orderStatus = "DELIVERED";
      subOrder.deliveredAt = new Date();

      // 2. Escrow: Release the remaining 50% if the upfront was successfully sent
      if (subOrder.escrow?.enabled && subOrder.escrow?.status === "UPFRONT_SENT") {
        const vendor = subOrder.vendorId;

        // Ensure we have a recipient code to send the money to
        if (vendor && vendor.bankAccount?.paystackRecipientCode) {
          try {
             console.log(`🔄 ESCROW: Releasing final ₦${subOrder.escrow.heldAmount} (50%) to ${vendor.businessName}...`);
             
             const transferRes = await axios.post(
               "https://api.paystack.co/transfer",
               {
                 source: "balance",
                 amount: subOrder.escrow.heldAmount * 100, // Paystack requires kobo
                 recipient: vendor.bankAccount.paystackRecipientCode,
                 reason: `Final 50% payout (Delivery Confirmed) for order ${subOrder.orderNumber}`,
               },
               {
                 headers: {
                   Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                   "Content-Type": "application/json",
                 },
               }
             );

             if (transferRes.data?.status) {
               subOrder.escrow.status = "RELEASED";
               subOrder.escrow.releaseReason = "CUSTOMER_CONFIRMED";
               subOrder.escrow.releasedAt = new Date();
               subOrder.escrow.finalTransferCode = transferRes.data.data.transfer_code;
               console.log(`✅ ESCROW: Final 50% released. Track: ${transferRes.data.data.transfer_code}`);
             } else {
                console.warn(`⚠️ ESCROW Release Failed directly from Paystack: ${transferRes.data?.message}`);
                // Don't mark as FAILED entirely so admin can retry, maybe just log it
             }
          } catch (error) {
            console.error(`❌ ESCROW Release Error for ${vendor.businessName}:`, error.response?.data || error.message);
          }
        }
      }

      await subOrder.save();
    }

    // Update Master order status
    masterOrder.orderStatus = "DELIVERED";
    masterOrder.deliveredAt = new Date();
    await masterOrder.save();

    return NextResponse.json({
      success: true,
      message: "Delivery confirmed and escrow released.",
    });
  } catch (error) {
    console.error("❌ Confirm Delivery Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
