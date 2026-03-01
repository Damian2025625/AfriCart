import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/config";
import Product from "@/lib/mongodb/models/Product";
import { getRates, createAddress, createParcel } from "@/lib/terminalAfrica";

// Fallback flat rate per vendor shipment (NGN) — used when Terminal Africa API is unavailable
const FALLBACK_RATE_PER_VENDOR = 2000;

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { items, customerAddress } = body;

    // Validate inputs
    if (!items || !items.length) {
      return NextResponse.json(
        { success: false, message: "No items provided" },
        { status: 400 }
      );
    }

    if (!customerAddress || !customerAddress.city || !customerAddress.state) {
      return NextResponse.json(
        { success: false, message: "Invalid customer address" },
        { status: 400 }
      );
    }

    // Group items by vendor so each vendor gets its own shipment
    const vendorItems = {};

    for (const item of items) {
      const product = await Product.findById(item.productId).populate(
        "vendorId",
        "businessName businessAddress city state country phone email"
      );

      if (!product) continue;

      const vendorId = product.vendorId._id.toString();
      if (!vendorItems[vendorId]) {
        vendorItems[vendorId] = {
          vendor: product.vendorId,
          items: [],
          totalWeight: 0,
        };
      }

      vendorItems[vendorId].items.push(item);
      // Accumulate weight; fallback to 1kg if not set on product
      vendorItems[vendorId].totalWeight += (product.weight || 1) * item.quantity;
    }

    if (Object.keys(vendorItems).length === 0) {
      return NextResponse.json(
        { success: true, totalDeliveryFee: 0, vendorDeliveryRates: {}, note: "No valid products found" },
        { status: 200 }
      );
    }

    let totalDeliveryFee = 0;
    const vendorDeliveryRates = {};
    let usedFallback = false;

    try {
      // Step 1: Create the Customer Delivery Address on Terminal Africa
      const fullName = customerAddress.fullName || "";
      const parts = fullName.split(" ");
      const customerTAAddressId = await createAddress({
        first_name: customerAddress.firstName || parts[0] || "Customer",
        last_name: customerAddress.lastName || parts.slice(1).join(" ") || "User",
        phone: customerAddress.phone || "08000000000",
        email: customerAddress.email || "customer@africart.com",
        line1: customerAddress.address || `${customerAddress.city}, ${customerAddress.state}`,
        city: customerAddress.city,
        state: customerAddress.state,
        zip: customerAddress.zipCode || "100001",
      });

      // For each vendor, calculate a distinct shipping rate
      for (const vendorId in vendorItems) {
        const vendorData = vendorItems[vendorId];
        const vendor = vendorData.vendor;

        const vendorAddrText =
          vendor.businessAddress || `${vendor.city || "Lagos"}, ${vendor.state || "Lagos"}`;

        // Step 2: Create Vendor Pickup Address on Terminal Africa
        const vendorTAPickupId = await createAddress({
          first_name: vendor.businessName,
          last_name: "Vendor",
          phone: vendor.phone || "08000000000",
          email: vendor.email || "vendor@africart.com",
          line1: vendorAddrText,
          city: vendor.city || "Lagos",
          state: vendor.state || "Lagos",
          zip: "100001",
        });

        // Step 3: Create a Parcel for this vendor's items
        const parcelId = await createParcel({
          description: `Order from ${vendor.businessName}`,
          weight_in_kg: vendorData.totalWeight || 1,
        });

        // Step 4: Get shipping rates from Terminal Africa
        const rates = await getRates({
          pickup_address_id: vendorTAPickupId,
          delivery_address_id: customerTAAddressId,
          parcel_id: parcelId,
        });

        if (!rates || rates.length === 0) {
          throw new Error(`No shipping rates available from Terminal Africa`);
        }

        // Pick cheapest (first) rate
        const selectedRate = rates[0];

        vendorDeliveryRates[vendorId] = {
          rateId: selectedRate.rate_id,
          carrierId: selectedRate.carrier_id,
          carrierName: selectedRate.carrier_name,
          currency: selectedRate.currency,
          amount: selectedRate.total_amount,
        };

        totalDeliveryFee += selectedRate.total_amount;
      }
    } catch (apiError) {
      // Terminal Africa API unavailable or key not yet activated — apply flat-rate fallback
      console.warn(
        "⚠️ Terminal Africa unavailable, using flat-rate fallback:",
        apiError.message
      );
      usedFallback = true;
      totalDeliveryFee = 0;

      for (const vendorId in vendorItems) {
        vendorDeliveryRates[vendorId] = {
          rateId: null,
          carrierId: null,
          carrierName: "Standard Delivery",
          currency: "NGN",
          amount: FALLBACK_RATE_PER_VENDOR,
        };
        totalDeliveryFee += FALLBACK_RATE_PER_VENDOR;
      }
    }

    return NextResponse.json(
      {
        success: true,
        totalDeliveryFee,
        vendorDeliveryRates,
        usedFallback,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Shipping Rate Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to calculate rates" },
      { status: 500 }
    );
  }
}
