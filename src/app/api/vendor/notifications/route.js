import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import PriceOffer from "@/lib/mongodb/models/PriceOffer";
import Order from "@/lib/mongodb/models/Order";
import Message from "@/lib/mongodb/models/Message";
import Conversation from "@/lib/mongodb/models/Conversation";
import Vendor from "@/lib/mongodb/models/Vendor";

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
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const userId = user.userId;
    const vendor = await Vendor.findOne({ userId }).lean();

    if (!vendor) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const vendorId = vendor._id;
    const notifications = [];

    // Parallelize all fetches
    const [pendingOffers, conversations, recentOrders, slashActivities] = await Promise.all([
      // 1. Pending price offers waiting for vendor response
      PriceOffer.find({
        vendorId,
        status: "PENDING",
      })
        .populate("productId", "name")
        .lean(),

      // 2. Conversations for unread messages
      Conversation.find({ vendorId }).select("_id").lean(),

      // 3. Recent orders incoming to the vendor (last 7 days)
      Order.find({
        vendorId,
        isMasterOrder: false,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean(),

      // 4. Community Slashing activities (last 3 days)
      (async () => {
        try {
          const CommunitySlash = (await import('@/lib/mongodb/models/CommunitySlash')).default;
          return await CommunitySlash.find({
            vendorId,
            updatedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
          }).populate("productId", "name").lean();
        } catch (e) {
          console.error("Slash fetch error:", e);
          return [];
        }
      })()
    ]);

    // Process pending offers
    pendingOffers.forEach((offer) => {
      notifications.push({
        id: `offer_${offer._id}_${offer.updatedAt.getTime()}`,
        type: "OFFER",
        title: "New Price Offer",
        message: `A customer made an offer for ${offer.productId?.name || "a product"}. Tap to review.`,
        link: "/dashboard/vendor/offers",
        date: offer.updatedAt,
      });
    });

    // Process unread messages
    if (conversations.length > 0) {
      const conversationIds = conversations.map((c) => c._id);

      const unreadStats = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            isRead: false,
            senderId: { $ne: userId },
          },
        },
        {
          $group: {
            _id: "$conversationId",
            count: { $sum: 1 },
            latestDate: { $max: "$createdAt" },
          },
        },
      ]);

      unreadStats.forEach((stat) => {
        notifications.push({
          id: `msg_${stat._id}_${new Date(stat.latestDate).getTime()}`,
          type: "MESSAGE",
          title: "New Messages",
          message: `You have ${stat.count} unread message(s) from a customer.`,
          link: `/dashboard/vendor/chats?conversation=${stat._id}`,
          date: stat.latestDate,
        });
      });
    }

    // Process slash activities
    (slashActivities || []).forEach(slash => {
      if (slash.status === "SUCCESS") {
        notifications.push({
          id: `slash_success_${slash._id}`,
          type: "OFFER",
          title: "Group Buy Goal Reached! 🎉",
          message: `The target for "${slash.productId?.name}" was reached. Customers can now buy at the slashed price.`,
          link: "/dashboard/vendor/promotions",
          date: slash.updatedAt,
        });
      } else if (slash.currentCount > 0) {
        notifications.push({
          id: `slash_progress_${slash._id}_${slash.currentCount}`,
          type: "OFFER",
          title: "Promotion Progress",
          message: `${slash.currentCount} customers have joined the group buy for "${slash.productId?.name}".`,
          link: "/dashboard/vendor/promotions",
          date: slash.updatedAt,
        });
      }
    });

    // Process recent orders
    recentOrders.forEach((order) => {
      const isNew = order.orderStatus === "PENDING";
      notifications.push({
        id: `order_${order._id}_${order.orderStatus}`,
        type: "ORDER",
        title: isNew ? "New Order Received!" : `Order ${order.orderStatus.charAt(0) + order.orderStatus.slice(1).toLowerCase()}`,
        message: isNew
          ? `Order #${order.orderNumber} is waiting for your confirmation.`
          : `Order #${order.orderNumber} status changed to ${order.orderStatus.toLowerCase()}.`,
        link: "/dashboard/vendor/orders",
        date: order.updatedAt,
      });
    });

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Vendor notifications fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", debug: error.message },
      { status: 500 }
    );
  }
}
