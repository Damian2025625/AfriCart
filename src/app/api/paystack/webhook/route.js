import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Verify Paystack webhook signature
function verifyWebhookSignature(body, signature) {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(request) {
  try {
    const body = await request.text(); // Get raw body for signature verification
    const signature = request.headers.get("x-paystack-signature");

    // 🔒 Verify the request is genuinely from Paystack
    if (!signature || !verifyWebhookSignature(body, signature)) {
      console.warn("❌ Invalid Paystack webhook signature");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const data = event.data;

    console.log(`📩 Paystack webhook received: ${eventType}`);

    await connectDB();

    switch (eventType) {
      // ─── Payment charged & successful ────────────────────────────────────
      case "charge.success": {
        const reference = data.reference;
        const metadata = data.metadata;
        console.log(`✅ charge.success for reference: ${reference}`);

        // Find master order by payment reference
        const order = await Order.findOne({
          paymentReference: reference,
          isMasterOrder: true,
        }).populate("subOrders");

        if (!order) {
          console.log(`⚠️ No order found for reference ${reference} yet.`);
          break;
        }

        const isCODPayment = metadata?.isCODPayment === true || metadata?.isCODPayment === "true";

        if (order.paymentStatus !== "PAID") {
          order.paymentStatus = "PAID";
          
          // If it's a COD payment being paid online, it's effectively delivered
          if (isCODPayment) {
            order.orderStatus = "DELIVERED";
            order.deliveredAt = new Date();
          } else {
            order.orderStatus = "CONFIRMED";
          }
          
          await order.save();

          // Update sub-orders as well
          if (order.subOrders && order.subOrders.length > 0) {
            for (const subOrder of order.subOrders) {
              const subOrderDoc = await Order.findById(subOrder._id);
              if (subOrderDoc) {
                subOrderDoc.paymentStatus = "PAID";
                if (isCODPayment) {
                  subOrderDoc.orderStatus = "DELIVERED";
                  subOrderDoc.deliveredAt = new Date();
                } else {
                  subOrderDoc.orderStatus = "CONFIRMED";
                }
                
                // Ensure vendor settlement is updated
                if (typeof subOrderDoc.calculateVendorSettlement === 'function') {
                    subOrderDoc.calculateVendorSettlement();
                }
                
                await subOrderDoc.save();
              }
            }
          }
          
          console.log(`✅ Order ${order.orderNumber} marked as PAID via webhook. ${isCODPayment ? "COD Payment confirmed." : ""}`);
        }
        break;
      }

      // ─── Refund processed ─────────────────────────────────────────────────
      case "refund.processed": {
        const reference = data.transaction_reference;
        console.log(`🔄 Refund processed for: ${reference}`);

        const order = await Order.findOne({
          paymentReference: reference,
          isMasterOrder: true,
        });

        if (order) {
          order.paymentStatus = "REFUNDED";
          await order.save();
          console.log(`✅ Order ${order.orderNumber} marked as REFUNDED`);
        }
        break;
      }

      // ─── Transfer (settlement) to vendor succeeded ────────────────────────
      case "transfer.success": {
        const transferCode = data.transfer_code;
        const recipient = data.recipient;
        console.log(`✅ Transfer success: ${transferCode}`);

        // Find sub-order matching the Paystack subaccount
        if (recipient?.subaccount?.subaccount_code) {
          const subaccountCode = recipient.subaccount.subaccount_code;
          const subOrders = await Order.find({
            isMasterOrder: false,
            "vendorSettlement.subaccountCode": subaccountCode,
            "vendorSettlement.status": "PENDING",
            paymentProvider: "PAYSTACK",
          });

          for (const subOrder of subOrders) {
            subOrder.vendorSettlement.status = "SETTLED";
            subOrder.vendorSettlement.settledAt = new Date();
            subOrder.vendorSettlement.lastReconciledAt = new Date();
            await subOrder.save();
            console.log(
              `✅ Sub-order ${subOrder.orderNumber} settlement SETTLED`
            );
          }
        }
        break;
      }

      // ─── Transfer failed ──────────────────────────────────────────────────
      case "transfer.failed": {
        const transferCode = data.transfer_code;
        console.warn(`❌ Transfer FAILED: ${transferCode}`);

        if (data.recipient?.subaccount?.subaccount_code) {
          const subaccountCode = data.recipient.subaccount.subaccount_code;
          const subOrders = await Order.find({
            isMasterOrder: false,
            "vendorSettlement.subaccountCode": subaccountCode,
            "vendorSettlement.status": "PENDING",
            paymentProvider: "PAYSTACK",
          });

          for (const subOrder of subOrders) {
            subOrder.vendorSettlement.reconciliationAttempts += 1;
            subOrder.vendorSettlement.lastReconciledAt = new Date();
            await subOrder.save();
          }
        }
        break;
      }

      // ─── Subscription events (for future use) ────────────────────────────
      case "subscription.create":
      case "subscription.disable":
      case "invoice.create":
      case "invoice.payment_failed":
      case "invoice.update":
        console.log(`ℹ️ Subscription/invoice event: ${eventType}`);
        break;

      default:
        console.log(`ℹ️ Unhandled Paystack event: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("❌ Paystack webhook error:", error.message);
    // Still return 200 so Paystack doesn't retry infinitely
    return NextResponse.json({ success: false, message: error.message });
  }
}
