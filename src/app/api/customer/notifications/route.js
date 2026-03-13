import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import PriceOffer from "@/lib/mongodb/models/PriceOffer";
import Order from "@/lib/mongodb/models/Order";
import Message from "@/lib/mongodb/models/Message";
import Conversation from "@/lib/mongodb/models/Conversation";
import Customer from "@/lib/mongodb/models/Customer";

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

export async function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const userId = user.userId;
    const customer = await Customer.findOne({ userId });
    
    if (!customer) {
      return NextResponse.json({ success: true, notifications: [] });
    }
    const customerId = customer._id;

    const notifications = [];

    // Parallelize independent data fetches
    const [offers, conversations, recentOrders] = await Promise.all([
      // 1. Fetch Offers needing customer attention
      PriceOffer.find({
        customerId,
        status: { $in: ["ACCEPTED", "COUNTERED"] }
      }).populate("productId", "name").lean(),

      // 2. Fetch Conversations to get IDs
      Conversation.find({ customerId }).select('_id').lean(),

      // 3. Fetch Recent Order Updates (last 7 days, all statuses)
      Order.find({
        customerId: userId,
        isMasterOrder: false,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).sort({ updatedAt: -1 }).limit(10).lean()
    ]);

    offers.forEach(offer => {
      let message = "";
      if (offer.status === "ACCEPTED") {
        message = `Your offer for ${offer.productId?.name || "a product"} was accepted at ₦${offer.finalPrice || offer.minPrice}.`;
      } else if (offer.status === "COUNTERED") {
        const lastCounter = offer.counterOffers?.[offer.counterOffers.length - 1];
        message = `A vendor requested ₦${lastCounter ? lastCounter.minPrice : offer.minPrice} for ${offer.productId?.name || "a product"}.`;
      }

      notifications.push({
        id: `offer_${offer._id}_${offer.updatedAt.getTime()}`,
        type: "OFFER",
        title: offer.status === "ACCEPTED" ? "Offer Accepted!" : "New Counter-Offer",
        message,
        link: "/dashboard/customer/offers",
        date: offer.updatedAt,
      });
    });

    // 2. Fetch Unread Messages using Aggregation for speed
    if (conversations.length > 0) {
      const conversationIds = conversations.map(c => c._id);
      
      const unreadStats = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            isRead: false,
            senderId: { $ne: userId }
          }
        },
        {
          $group: {
            _id: "$conversationId",
            count: { $sum: 1 },
            latestDate: { $max: "$createdAt" }
          }
        }
      ]);

      unreadStats.forEach(stat => {
        notifications.push({
          id: `msg_${stat._id}_${new Date(stat.latestDate).getTime()}`,
          type: "MESSAGE",
          title: "New Messages",
          message: `You have ${stat.count} unread message(s) from a vendor.`,
          link: `/dashboard/customer/chat?conversation=${stat._id}`,
          date: stat.latestDate,
        });
      });
    }

    // 3. Process Recent Order Updates
    recentOrders.forEach(order => {
      // Create a unique ID for the status update so it only alerts once per status
      notifications.push({
        id: `order_${order._id}_${order.orderStatus}`,
        type: "ORDER",
        title: `Order ${order.orderStatus.charAt(0) + order.orderStatus.slice(1).toLowerCase()}`,
        message: `Your order ${order.orderNumber} is now ${order.orderStatus.toLowerCase()}`,
        link: `/dashboard/customer/orders`,
        date: order.updatedAt,
      });
    });

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ success: false, message: "Internal server error", debug: error.message }, { status: 500 });
  }
}
