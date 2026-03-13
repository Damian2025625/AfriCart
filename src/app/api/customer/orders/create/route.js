import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Order from "@/lib/mongodb/models/Order";
import Cart from "@/lib/mongodb/models/Cart";
import Product from "@/lib/mongodb/models/Product";
import Vendor from "@/lib/mongodb/models/Vendor";
import User from "@/lib/mongodb/models/User";
import CommunitySlash from "@/lib/mongodb/models/CommunitySlash";
import { sendOrderNotifications } from "@/lib/notifications";

// ✅ Configuration: Platform commission rate
const PLATFORM_COMMISSION_RATE = 0.03; // 3%

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AC-${timestamp}-${random}`;
}

// ✅ NEW: Calculate vendor settlement amount
function calculateVendorSettlement(orderTotal, commissionRate = PLATFORM_COMMISSION_RATE) {
  const platformCommission = orderTotal * commissionRate;
  const vendorAmount = orderTotal - platformCommission;
  
  return {
    vendorAmount,
    platformCommission,
    platformCommissionRate: commissionRate,
  };
}

// ✅ NEW: Get next business day for settlement
function getNextBusinessDay() {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends
  const dayOfWeek = nextDay.getDay();
  if (dayOfWeek === 0) nextDay.setDate(nextDay.getDate() + 1); // Sunday → Monday
  if (dayOfWeek === 6) nextDay.setDate(nextDay.getDate() + 2); // Saturday → Monday
  
  return nextDay;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const {
      shippingAddress,
      paymentMethod,
      items,
      subtotal,
      deliveryFee,
      isGiftWrapped,
      giftWrapFee,
      total,
      vendorDeliveryRates,
    } = await request.json();

    if (!shippingAddress || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const customer = await User.findById(decoded.userId);

    const itemsByVendor = {};
    const allOrderItems = [];

    for (const item of items) {
      let productId;
      if (typeof item.productId === "string") {
        productId = item.productId;
      } else if (item.productId?._id) {
        productId = item.productId._id;
      } else if (item.product) {
        productId = item.product._id || item.product;
      } else {
        console.error("Invalid item structure:", item);
        continue;
      }

      const product = await Product.findById(productId);

      if (!product) {
        return NextResponse.json(
          { success: false, message: `Product not found: ${productId}` },
          { status: 404 }
        );
      }

      // ─────────────────────────────────────────────────────────
      // ATOMIC stock check: only decrement if enough stock exists.
      // This prevents overselling even under concurrent requests.
      // ─────────────────────────────────────────────────────────
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity, totalSold: item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        // Stock was insufficient (race condition or last unit already sold)
        return NextResponse.json(
          {
            success: false,
            message: `"${product.name}" is out of stock or has insufficient quantity. Please update your cart.`,
          },
          { status: 400 }
        );
      }

      const vendorId = product.vendorId.toString();

      // ✅ Check for Price Offer / Slash Price if no custom price or as validation
      let itemPrice = product.price;

      // 1. Check for traditional custom price
      if (item.customPrice) {
        itemPrice = item.customPrice;
      } else {
        // 2. Check for Accepted Price Offer (Make an Offer)
        const PriceOffer = (await import("@/lib/mongodb/models/PriceOffer")).default;
        const acceptedOffer = await PriceOffer.findOne({
          productId: product._id,
          customerId: decoded.userId, // This needs to be the Customer model ID, but we have userId. 
          // Wait, decoded.userId is the User ID. PriceOffer uses Customer model ID.
          status: 'ACCEPTED',
          expiresAt: { $gt: new Date() }
        }).populate('customerId');

        // We need to verify if this PriceOffer belongs to the current user
        // The customer model ID is linked to the user ID.
        
        // Actually, let's fetch the customer first or use a join-style check.
        // But since we are inside a loop, let's be efficient.
        
        // Revised logic: Find customer if not already found
        const Customer = (await import("@/lib/mongodb/models/Customer")).default;
        const customerProfile = await Customer.findOne({ userId: decoded.userId });
        
        const realAcceptedOffer = await PriceOffer.findOne({
          productId: product._id,
          customerId: customerProfile?._id,
          status: { $in: ['ACCEPTED', 'CLAIMED'] },
          expiresAt: { $gt: new Date() }
        });

        if (realAcceptedOffer) {
          itemPrice = realAcceptedOffer.finalPrice || realAcceptedOffer.maxPrice;
          
          // ✅ Mark offer as COMPLETED
          await PriceOffer.findByIdAndUpdate(realAcceptedOffer._id, { status: 'COMPLETED' });
          console.log(`✅ Marked PriceOffer ${realAcceptedOffer._id} as COMPLETED`);
        } else {
          // 3. Fallback backend check for successful community slash
          const activeSlash = await CommunitySlash.findOne({
            productId: product._id,
            status: 'SUCCESS',
            'participants.userId': decoded.userId,
            purchaseWindowEndTime: { $gt: new Date() }
          });

          if (activeSlash) {
            itemPrice = activeSlash.slashedPrice;
            
            // ✅ Mark participant as having purchased
            await CommunitySlash.updateOne(
              { _id: activeSlash._id, "participants.userId": decoded.userId },
              { $set: { "participants.$.hasPurchased": true } }
            );
          }
        }
      }

      const orderItem = {
        productId: product._id,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity,
        image: product.images?.[0] || null,
        vendorId: product.vendorId,
      };

      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(orderItem);
      allOrderItems.push(orderItem);
    }

    const masterOrderNumber = generateOrderNumber();

    // ✅ Create master order (no settlement calculation for master orders)
    const masterOrder = await Order.create({
      orderNumber: masterOrderNumber,
      customerId: decoded.userId,
      items: allOrderItems,
      shippingAddress,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      isGiftWrapped: isGiftWrapped || false,
      giftWrapFee: giftWrapFee || 0,
      total: total,
      paymentMethod,
      paymentStatus: paymentMethod === "CASH_ON_DELIVERY" ? "PENDING" : "PENDING",
      orderStatus: "PENDING",
      isMasterOrder: true,
      subOrders: [],
    });

    console.log(`✅ Created MASTER ORDER ${masterOrderNumber}`);

    const subOrderIds = [];
    const notificationPromises = [];

    for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
      const vendorSubtotal = vendorItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Extract delivery rate specific to this vendor if available
      let vendorDeliveryFee = 0;
      let shippingDetails = null;

      if (vendorDeliveryRates && vendorDeliveryRates[vendorId]) {
        vendorDeliveryFee = vendorDeliveryRates[vendorId].amount;
        shippingDetails = {
          rateId: vendorDeliveryRates[vendorId].rateId,
          carrierId: vendorDeliveryRates[vendorId].carrierId,
          carrierName: vendorDeliveryRates[vendorId].carrierName,
        };
      } else {
        // Fallback to proportional split if dynamic rates were somehow lost
        vendorDeliveryFee = Math.round((vendorSubtotal / subtotal) * deliveryFee);
      }

      const vendorTotal = vendorSubtotal + vendorDeliveryFee;

      // ✅ CRITICAL: Calculate vendor settlement amounts
      const settlement = calculateVendorSettlement(vendorTotal);

      // ✅ Create sub-order with settlement tracking
      const subOrder = await Order.create({
        orderNumber: `${masterOrderNumber}-V${subOrderIds.length + 1}`,
        customerId: decoded.userId,
        vendorId: vendorId,
        items: vendorItems,
        shippingAddress,
        subtotal: vendorSubtotal,
        deliveryFee: vendorDeliveryFee,
        total: vendorTotal,
        paymentMethod,
        paymentStatus: paymentMethod === "CASH_ON_DELIVERY" ? "PENDING" : "PENDING",
        orderStatus: "PENDING",
        isMasterOrder: false,
        masterOrderId: masterOrder._id,
        
        // ✅ NEW: Vendor settlement tracking
        vendorSettlement: {
          amount: settlement.vendorAmount,
          platformCommission: settlement.platformCommission,
          platformCommissionRate: settlement.platformCommissionRate,
          status: 'PENDING', // Will be updated when payment is confirmed
          expectedSettlementDate: null, // Set when payment is confirmed
        },

        // ✅ NEW: Shipping provider details (Terminal Africa)
        shippingDetails: shippingDetails ? {
          rateId: shippingDetails.rateId,
          carrierId: shippingDetails.carrierId,
          carrierName: shippingDetails.carrierName,
          status: 'PENDING',
        } : null,
      });

      console.log(`✅ Created SUB-ORDER: ${subOrder.orderNumber}`);
      console.log(`   💰 Vendor will receive: ₦${settlement.vendorAmount.toFixed(2)}`);
      console.log(`   🏦 Platform commission: ₦${settlement.platformCommission.toFixed(2)}`);

      subOrderIds.push(subOrder._id);

      const vendor = await Vendor.findById(vendorId).populate('userId');
      
      if (vendor && vendor.userId) {
        const vendorUser = vendor.userId;

        notificationPromises.push(
          sendOrderNotifications({
            vendor: vendor,
            vendorUser: vendorUser,
            order: subOrder,
            customer: customer,
          }).catch(err => console.error('❌ Notification error:', err))
        );
      }

      // (Stock was already decremented atomically per item above)
    }

    masterOrder.subOrders = subOrderIds;
    await masterOrder.save();

    // Clear the customer's cart after order is fully created
    await Cart.deleteMany({ customerId: decoded.userId });
    console.log(`🛒 Cart cleared for user ${decoded.userId}`);

    // Stock was already decremented atomically above — no bulkWrite needed here

    Promise.all(notificationPromises).then(() => {
      console.log('✅ All vendor notifications sent');
    });

    console.log(`🎉 Order ${masterOrderNumber} created successfully`);

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      orders: [masterOrder],
      masterOrder: masterOrder,
      subOrders: subOrderIds,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 }
    );
  }
}