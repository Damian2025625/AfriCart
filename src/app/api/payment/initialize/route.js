import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import CustomProductPrice from "@/lib/mongodb/models/CustomProductPrice";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function getCustomPrice(productId, customerId) {
  try {
    const customPriceDoc = await CustomProductPrice.findOne({
      productId,
      customerId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
    return customPriceDoc ? customPriceDoc.customPrice : null;
  } catch (error) {
    console.error("Error fetching custom price:", error);
    return null;
  }
}

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
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const {
      email,
      amount,
      customerName,
      phone,
      cartItems = [],
      metadata = {},
    } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // ── Build vendor split data ──────────────────────────────────────────────
    const vendorData = new Map();
    const vendorsWithoutSubaccounts = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (!product || !product.vendorId) continue;

      const vendor = await Vendor.findById(product.vendorId);
      if (!vendor) {
        console.warn(`Vendor not found for product ${product._id}`);
        continue;
      }

      if (
        !vendor.paystackSubaccount?.subaccountCode ||
        !vendor.paystackSubaccount?.isActive
      ) {
        vendorsWithoutSubaccounts.push(vendor.businessName);
        console.warn(`Vendor ${vendor.businessName} has no active Paystack subaccount`);
        continue;
      }

      const customPrice = await getCustomPrice(product._id, user.userId);
      const itemPrice = customPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      const vendorId = vendor._id.toString();

      if (!vendorData.has(vendorId)) {
        vendorData.set(vendorId, {
          subaccountCode: vendor.paystackSubaccount.subaccountCode,
          businessName: vendor.businessName,
          percentageCharge: vendor.paystackSubaccount.percentageCharge || 3,
          itemsTotal: 0,
        });
      }

      vendorData.get(vendorId).itemsTotal += itemTotal;
    }

    if (vendorData.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            vendorsWithoutSubaccounts.length > 0
              ? `These vendors are not yet set up for payments: ${vendorsWithoutSubaccounts.join(", ")}. Please contact support.`
              : "No vendors configured for payment processing.",
        },
        { status: 400 }
      );
    }

    // ── Build Paystack payload ───────────────────────────────────────────────
    const reference = `AFRI-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const amountInKobo = Math.round(amount * 100); // Paystack uses kobo

    const paystackData = {
      email,
      amount: amountInKobo,
      currency: "NGN",
      reference,
      // Explicitly pass all channels — without this Paystack ignores your dashboard
      // settings and defaults to only 'card' + 'bank' (USSD).
      channels: ["card", "bank", "ussd", "bank_transfer", "mobile_money", "qr"],
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/payment/verify`,
      metadata: {
        cancel_action: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/cart`,
        custom_fields: [
          { display_name: "Customer Name", variable_name: "customer_name", value: customerName || email },
          { display_name: "Customer Phone", variable_name: "customer_phone", value: phone || "" },
        ],
        // Shipping / order info
        shipping_name: customerName,
        shipping_phone: phone,
        shipping_address: metadata.address || "",
        shipping_city: metadata.city || "",
        shipping_state: metadata.state || "",
        shipping_zip: metadata.zipCode || "",
        shipping_info: metadata.additionalInfo || "",
        subtotal: metadata.subtotal,
        deliveryFee: metadata.deliveryFee,
        isGiftWrapped: metadata.isGiftWrapped,
        giftWrapFee: metadata.giftWrapFee,
        customer_id: user.userId,
        cartItems: JSON.stringify(cartItems),
      },
    };

    // ── Attach subaccount (single vendor) or split (multi-vendor) ───────────
    if (vendorData.size === 1) {
      // Single vendor — attach subaccount directly, vendor bears the processing fee
      const [vendorInfo] = vendorData.values();
      paystackData.subaccount = vendorInfo.subaccountCode;
      paystackData.bearer = "subaccount"; // Vendor bears Paystack transaction fee
    } else {
      // Multi-vendor — attach primary vendor subaccount
      // Note: True multi-vendor splits require a Paystack Split Group created via /split
      const [primaryVendor] = vendorData.values();
      paystackData.subaccount = primaryVendor.subaccountCode;
      paystackData.bearer = "subaccount";
      // Store vendor breakdown in metadata for manual reconciliation
      paystackData.metadata.vendorSplits = JSON.stringify(
        Array.from(vendorData.entries()).map(([id, data]) => ({
          vendorId: id,
          subaccountCode: data.subaccountCode,
          businessName: data.businessName,
          share: data.itemsTotal,
        }))
      );
    }

    console.log(`🔄 Initializing Paystack payment: ${reference} | Amount: ₦${amount}`);

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
      throw new Error(response.data.message || "Paystack initialization failed");
    }

    console.log(`✅ Paystack payment initialized: ${reference}`);

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
        vendors: Array.from(vendorData.values()).map((v) => v.businessName),
      },
    });
  } catch (error) {
    console.error("❌ Payment initialize error:", error.message);
    return NextResponse.json(
      { success: false, message: error.response?.data?.message || error.message },
      { status: 500 }
    );
  }
}
