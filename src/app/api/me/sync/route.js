import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/config";
import jwt from "jsonwebtoken";
import Customer from "@/lib/mongodb/models/Customer";
import Vendor from "@/lib/mongodb/models/Vendor";
import Cart from "@/lib/mongodb/models/Cart";
import PriceOffer from "@/lib/mongodb/models/PriceOffer";
import Conversation from "@/lib/mongodb/models/Conversation";
import Message from "@/lib/mongodb/models/Message";
import Order from "@/lib/mongodb/models/Order";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const { userId, role } = decoded;

    const data = {
      success: true,
      counts: {
        notifications: 0,
        messages: 0,
        offers: 0,
        cart: 0,
      }
    };

    if (role === "CUSTOMER") {
      const pStart = Date.now();
      
      // Parallelize identifying the customer and the counts
      const customer = await Customer.findOne({ userId }).select('_id').lean();
      if (!customer) return NextResponse.json(data);

      const [cartData, offersCount, messagesData, ordersCount] = await Promise.all([
        Cart.findOne({ customerId: customer._id }).select("items").lean(),
        PriceOffer.countDocuments({ customerId: customer._id, status: { $in: ["ACCEPTED", "COUNTERED"] } }),
        Conversation.aggregate([
          { $match: { customerId: customer._id } },
          { $group: { _id: null, total: { $sum: "$unreadCount" } } }
        ]),
        Order.countDocuments({ customerId: userId, isMasterOrder: false, updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      ]);

      data.counts.cart = cartData?.items?.length || 0;
      data.counts.offers = offersCount;
      data.counts.messages = messagesData[0]?.total || 0;
      data.counts.notifications = data.counts.offers + data.counts.messages + ordersCount;
      console.log(`Sync optimized queries took ${Date.now() - pStart}ms`);

    } else if (role === "VENDOR") {
      const vendor = await Vendor.findOne({ userId }).lean();
      if (!vendor) return NextResponse.json(data);

      const [pendingOffersCount, unreadMessagesData, pendingOrdersCount] = await Promise.all([
        // 1. Pending Offers (Waiting for vendor to accept/counter)
        PriceOffer.countDocuments({
          vendorId: vendor._id,
          status: "PENDING"
        }),

        // 2. Unread Messages Count - MATCHING Notifications logic (Sender NOT me + isRead false)
        Message.aggregate([
          {
            $match: {
              senderId: { $ne: userId },
              isRead: false
            }
          },
          {
            $lookup: {
              from: "conversations",
              localField: "conversationId",
              foreignField: "_id",
              as: "conv"
            }
          },
          { $unwind: "$conv" },
          { $match: { "conv.vendorId": vendor._id } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),

        // 3. Orders: ALL pending (matching Notifications logic)
        Order.countDocuments({
          vendorId: vendor._id,
          isMasterOrder: false,
          orderStatus: "PENDING"
        })
      ]);

      const msgCount = unreadMessagesData[0]?.count || 0;
      data.counts.offers = pendingOffersCount;
      data.counts.messages = msgCount;
      data.counts.notifications = pendingOffersCount + msgCount + pendingOrdersCount;
      data.counts.pendingOrders = pendingOrdersCount;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
