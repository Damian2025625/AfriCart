import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import Cart from "@/lib/mongodb/models/Cart";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import User from "@/lib/mongodb/models/User";
import CustomProductPrice from "@/lib/mongodb/models/CustomProductPrice";
import axios from "axios";
import { sendOrderNotifications } from "@/lib/notifications";

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

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AC-${timestamp}-${random}`;
}

async function getCustomPrice(productId, customerId) {
  try {
    const customPriceDoc = await CustomProductPrice.findOne({
      productId: productId,
      customerId: customerId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
    return customPriceDoc ? customPriceDoc.customPrice : null;
  } catch (error) {
    return null;
  }
}

// Calculate T+1 settlement date (skip weekends)
function calculateExpectedSettlementDate(fromDate = new Date()) {
  const settlementDate = new Date(fromDate);
  settlementDate.setDate(settlementDate.getDate() + 1);
  const dayOfWeek = settlementDate.getDay();
  if (dayOfWeek === 0) settlementDate.setDate(settlementDate.getDate() + 1); // Sunday → Monday
  if (dayOfWeek === 6) settlementDate.setDate(settlementDate.getDate() + 2); // Saturday → Monday
  return settlementDate;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Payment reference is required" },
        { status: 400 }
      );
    }

    // 🛡️ GUARD 1: Check for existing order first
    const existingOrder = await Order.findOne({
      paymentReference: reference,
      isMasterOrder: true,
    });
    if (existingOrder) {
      console.log("✅ Order already exists:", existingOrder.orderNumber);
      return NextResponse.json({
        success: true,
        data: {
          reference,
          order: {
            id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
          },
        },
      });
    }

    // Verify with Paystack
    console.log("🔄 Verifying payment with Paystack:", reference);
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.data.status || response.data.data.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          message: `Payment not successful. Status: ${response.data.data?.status || "unknown"}`,
        },
        { status: 400 }
      );
    }

    const paymentData = response.data.data;

    // 🛡️ GUARD 2: Concurrency check
    const doubleCheck = await Order.findOne({
      paymentReference: reference,
      isMasterOrder: true,
    });
    if (doubleCheck) {
      console.log("✅ Order created by another request:", doubleCheck.orderNumber);
      return NextResponse.json({
        success: true,
        data: { order: { orderNumber: doubleCheck.orderNumber } },
      });
    }

    // Extract metadata from Paystack response
    // Paystack returns metadata as an object
    const metadata = paymentData.metadata || {};

    const shippingAddress = {
      fullName:
        metadata.shipping_name ||
        `${paymentData.customer?.first_name || ""} ${paymentData.customer?.last_name || ""}`.trim() ||
        "Customer",
      phone:
        metadata.shipping_phone ||
        paymentData.customer?.phone ||
        "0000000000",
      address: metadata.shipping_address || "Address Not Provided",
      city: metadata.shipping_city || "City Not Provided",
      state: metadata.shipping_state || "State Not Provided",
      zipCode: metadata.shipping_zip || "",
      additionalInfo: metadata.shipping_info || "",
    };

    // Load cart items
    let cartItems = [];
    let cart = await Cart.findOne({ customerId: user.userId }).populate({
      path: "items.productId",
      populate: { path: "vendorId" },
    });

    if (cart && cart.items?.length > 0) {
      for (const item of cart.items) {
        const customPrice =
          item.customPrice ||
          (await getCustomPrice(item.productId._id, user.userId));
        cartItems.push({
          productId: item.productId,
          quantity: item.quantity,
          customPrice,
        });
      }
    } else {
      // Reconstruct from metadata (Paystack stores cartItems as a string in metadata)
      let metaItems = [];
      try {
        metaItems =
          typeof metadata.cartItems === "string"
            ? JSON.parse(metadata.cartItems)
            : metadata.cartItems || [];
      } catch (e) {
        console.error("❌ Meta parse error", e);
      }

      for (const m of metaItems) {
        const prod = await Product.findById(m.productId).populate("vendorId");
        if (prod) {
          const cp =
            m.customPrice || (await getCustomPrice(prod._id, user.userId));
          cartItems.push({
            productId: prod,
            quantity: m.quantity,
            customPrice: cp,
          });
        }
      }
    }

    if (cartItems.length === 0) {
      throw new Error("Cart items missing - cannot create order");
    }

    // ──────────────────────────────────────────────────────────────────
    // PRE-FLIGHT STOCK CHECK: validate all items have enough stock
    // before we create any orders (fail-fast before any DB writes)
    // ──────────────────────────────────────────────────────────────────
    for (const item of cartItems) {
      const prod = item.productId;
      if (prod.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${prod.quantity}, Requested: ${item.quantity}.`
        );
      }
    }

    // Group by vendor
    const vendorOrders = new Map();
    const allItemsForMaster = [];

    for (const item of cartItems) {
      const vId = item.productId.vendorId._id.toString();
      const price = item.customPrice || item.productId.price;
      const orderItem = {
        productId: item.productId._id,
        name: item.productId.name,
        price,
        quantity: item.quantity,
        image: item.productId.images?.[0] || null,
        vendorId: item.productId.vendorId._id,
      };
      allItemsForMaster.push(orderItem);

      if (!vendorOrders.has(vId)) {
        vendorOrders.set(vId, {
          vendorId: item.productId.vendorId._id,
          vendor: item.productId.vendorId,
          items: [],
          subtotal: 0,
        });
      }
      const vOrder = vendorOrders.get(vId);
      vOrder.items.push(orderItem);
      vOrder.subtotal += price * item.quantity;
    }

    // Paystack returns amount in kobo, convert to naira
    const paidAmountNaira = paymentData.amount / 100;
    const paidAt = new Date(paymentData.paid_at);

    // ✅ CREATE MASTER ORDER
    const masterOrder = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: user.userId,
      isMasterOrder: true,
      shippingAddress,
      paymentMethod: (paymentData.channel || "CARD").toUpperCase(),
      paymentStatus: "PAID",
      paymentReference: reference,
      paymentProvider: "PAYSTACK",
      paymentDetails: {
        amount: paidAmountNaira,
        paidAt,
        transactionId: String(paymentData.id),
      },
      orderStatus: "CONFIRMED",
      subtotal: parseFloat(metadata.subtotal) || paidAmountNaira - (parseFloat(metadata.deliveryFee) || 0) - (parseFloat(metadata.giftWrapFee) || 0),
      deliveryFee: parseFloat(metadata.deliveryFee) || 0,
      isGiftWrapped: metadata.isGiftWrapped === true || metadata.isGiftWrapped === "true",
      giftWrapFee: parseFloat(metadata.giftWrapFee) || 0,
      total: paidAmountNaira,
      items: allItemsForMaster,
    });

    console.log(`✅ Created MASTER ORDER: ${masterOrder.orderNumber}`);

    // ✅ CREATE SUB-ORDERS WITH SETTLEMENT TRACKING
    const subOrderIds = [];
    const customerUser = await User.findById(user.userId);
    const expectedSettlementDate = calculateExpectedSettlementDate(paidAt);

    for (const [, vData] of vendorOrders.entries()) {
      const vendor = vData.vendor;

      const platformCommissionRate = 0.03;
      const platformCommission = vData.subtotal * platformCommissionRate;
      const vendorAmount = vData.subtotal - platformCommission;

      console.log(`\n💰 Vendor ${vendor.businessName} Settlement:`);
      console.log(`   Order Total: ₦${vData.subtotal}`);
      console.log(`   Platform Commission (3%): ₦${platformCommission.toFixed(2)}`);
      console.log(`   Vendor Amount (97%): ₦${vendorAmount.toFixed(2)}`);
      console.log(`   Expected Settlement: ${expectedSettlementDate.toISOString().split("T")[0]}`);

      const subOrder = await Order.create({
        orderNumber: `${masterOrder.orderNumber}-V${subOrderIds.length + 1}`,
        customerId: user.userId,
        vendorId: vendor._id,
        isMasterOrder: false,
        masterOrderId: masterOrder._id,
        shippingAddress: masterOrder.shippingAddress,
        paymentMethod: masterOrder.paymentMethod,
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        items: vData.items,
        subtotal: vData.subtotal,
        total: vData.subtotal,
        paymentProvider: "PAYSTACK",

        // ✅ ESCROW TRACKING
        escrow: {
          enabled: true,
          totalAmount: vendorAmount,
          upfrontAmount: 0, // Computed below
          heldAmount: 0,    // Computed below
          status: "PENDING",
        },
        
        // OLD Settlement Tracking (kept for legacy support if needed)
        vendorSettlement: {
          amount: vendorAmount,
          platformCommission,
          platformCommissionRate,
          status: "PENDING",
          paidAt,
          expectedSettlementDate,
          transactionId: String(paymentData.id),
          subaccountCode: vendor.paystackSubaccount?.subaccountCode,
          lastReconciledAt: new Date(),
          reconciliationAttempts: 0,
        },
      });

      console.log(`✅ Created SUB-ORDER: ${subOrder.orderNumber}`);
      subOrderIds.push(subOrder._id);

      // ────────────────────────────────────────────────────────────────
      // ✅ ESCROW: INITIATE 50% UPFRONT TRANSFER
      // ────────────────────────────────────────────────────────────────
      // Only do this if the vendor has a recipient code configured (from our new subaccount step)
      if (vendor.bankAccount?.paystackRecipientCode) {
        const upfrontAmount = Math.floor(vendorAmount * 0.5);
        const heldAmount = vendorAmount - upfrontAmount;

        subOrder.escrow.upfrontAmount = upfrontAmount;
        subOrder.escrow.heldAmount = heldAmount;

        try {
          console.log(`🔄 ESCROW: Sending ₦${upfrontAmount} (50%) upfront to ${vendor.businessName}...`);
          // Send 50% via Transfers API
          const transferRes = await axios.post(
            "https://api.paystack.co/transfer",
            {
              source: "balance",
              amount: upfrontAmount * 100, // Paystack requires kobo
              recipient: vendor.bankAccount.paystackRecipientCode,
              reason: `Upfront 50% payout for order ${subOrder.orderNumber}`,
            },
            {
              headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (transferRes.data?.status) {
            subOrder.escrow.status = "UPFRONT_SENT";
            subOrder.escrow.upfrontPaidAt = new Date();
            subOrder.escrow.upfrontTransferCode = transferRes.data.data.transfer_code;
            subOrder.escrow.autoReleaseAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 days
            console.log(`✅ ESCROW: 50% sent successfully. Track: ${transferRes.data.data.transfer_code}`);
          } else {
            console.warn(`⚠️ ESCROW: Paystack returned error for transfer: ${transferRes.data?.message}`);
            subOrder.escrow.status = "FAILED";
          }
        } catch (transferError) {
          console.error(`❌ ESCROW: Transfer failed for vendor ${vendor.businessName}:`, transferError.response?.data || transferError.message);
          subOrder.escrow.status = "FAILED";
        }
        await subOrder.save();
      } else {
        console.warn(`⚠️ ESCROW: Vendor ${vendor.businessName} has no paystackRecipientCode. Cannot send 50% upfront automatically.`);
        subOrder.escrow.status = "FAILED";
        await subOrder.save();
      }

      // ────────────────────────────────────────────────────────────────
      // ATOMIC stock decrement per item — prevents overselling
      // findOneAndUpdate with $gte guard: MongoDB only decrements if
      // enough stock exists; returns null if the condition fails.
      // ────────────────────────────────────────────────────────────────
      for (const item of vData.items) {
        const decremented = await Product.findOneAndUpdate(
          { _id: item.productId, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity, totalSold: item.quantity } },
          { new: true }
        );
        if (!decremented) {
          console.warn(`⚠️ Stock atomic fail for product ${item.productId} — may be oversold`);
        }
      }

      // Send notifications
      if (vendor.userId) {
        const vendorUserDoc = await User.findById(vendor.userId).select(
          "firstName lastName email phone"
        );
        if (vendorUserDoc) {
          sendOrderNotifications({
            vendor,
            vendorUser: vendorUserDoc,
            order: subOrder,
            customer: customerUser,
          }).catch((e) => console.error("❌ Notification error:", e));
        }
      }
    }

    // Link sub-orders to master
    masterOrder.subOrders = subOrderIds;
    await masterOrder.save();

    // Clear the customer's cart — use deleteMany for reliability
    await Cart.deleteMany({ customerId: user.userId });
    console.log(`🛒 Cart cleared for user ${user.userId}`);

    // Stock was already decremented atomically per item above

    console.log(`\n🎉 Paystack order completed!`);
    console.log(`   Master Order: ${masterOrder.orderNumber}`);
    console.log(`   Sub-Orders: ${subOrderIds.length}`);

    return NextResponse.json({
      success: true,
      data: {
        reference,
        order: {
          id: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
        },
      },
    });
  } catch (error) {
    console.error("❌ Paystack Verify Error:", error.message);

    if (error.code === 11000) {
      const existingOrder = await Order.findOne({
        paymentReference: reference,
        isMasterOrder: true,
      });
      if (existingOrder) {
        return NextResponse.json({
          success: true,
          data: { order: { orderNumber: existingOrder.orderNumber } },
        });
      }
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return NextResponse.json({ success: true });
}
