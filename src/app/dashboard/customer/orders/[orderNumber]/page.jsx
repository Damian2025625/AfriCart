"use client";

import React, { useState, useEffect } from "react";
import {
  FiArrowLeft,
  FiPackage,
  FiMapPin,
  FiPhone,
  FiMail,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiBox,
  FiStar,
  FiMessageSquare,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderNumber = params.orderNumber;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  
  // Dispute State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeMessage, setDisputeMessage] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/customer/orders/${orderNumber}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
      } else {
        toast.error(data.message || "Order not found");
        router.push("/dashboard/customer/orders");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setCancelling(true);

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/customer/orders/${orderNumber}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Order cancelled successfully");
        setShowCancelModal(false);
        fetchOrderDetails();
      } else {
        toast.error(data.message || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleCODPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/paystack/payment/cod-pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderNumber }),
      });

      const data = await response.json();

      if (data.success && data.data?.authorization_url) {
        // Redirect to Paystack checkouts
        window.location.href = data.data.authorization_url;
      } else {
        toast.error(data.message || "Failed to initialize payment");
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
      setIsProcessingPayment(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason || !disputeMessage.trim()) {
      toast.error("Please provide both a reason and a message");
      return;
    }

    setSubmittingDispute(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/customer/orders/${orderNumber}/dispute`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: disputeReason,
          message: disputeMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Dispute submitted successfully");
        setShowDisputeModal(false);
        fetchOrderDetails();
      } else {
        toast.error(data.message || "Failed to submit dispute");
      }
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast.error("Failed to submit dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
      CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
      PROCESSING: "bg-purple-100 text-purple-700 border-purple-200",
      SHIPPED: "bg-orange-100 text-orange-700 border-orange-200",
      DELIVERED: "bg-green-100 text-green-700 border-green-200",
      CANCELLED: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: FiClock,
      CONFIRMED: FiCheckCircle,
      PROCESSING: FiBox,
      SHIPPED: FiTruck,
      DELIVERED: FiCheckCircle,
      CANCELLED: FiXCircle,
    };
    return icons[status] || FiPackage;
  };

  const canCancelOrder = (status) => {
    return ["PENDING", "CONFIRMED"].includes(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Order not found
          </h2>
          <Link
            href="/dashboard/customer/orders"
            className="text-orange-500 hover:text-orange-600"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(order.orderStatus);

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Orders</span>
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-600">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusIcon className="w-6 h-6 text-gray-600" />
            <span
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${getStatusColor(
                order.orderStatus
              )}`}
            >
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Order Timeline
          </h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-4">
              {/* Order Placed */}
              <div className="flex gap-4">
                <div className="relative">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-10">
                    <FiCheckCircle className="text-white w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-gray-900 text-sm">
                    Order Placed
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>

              {/* Confirmed */}
              {["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
                order.orderStatus
              ) && (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-10">
                      <FiCheckCircle className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-gray-900 text-sm">
                      Order Confirmed
                    </p>
                    <p className="text-xs text-gray-600">
                      Vendor confirmed your order
                    </p>
                  </div>
                </div>
              )}

              {/* Processing */}
              {["PROCESSING", "SHIPPED", "DELIVERED"].includes(
                order.orderStatus
              ) && (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-10">
                      <FiBox className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-gray-900 text-sm">
                      Processing
                    </p>
                    <p className="text-xs text-gray-600">
                      Your order is being prepared
                    </p>
                  </div>
                </div>
              )}

              {/* Shipped */}
              {["SHIPPED", "DELIVERED"].includes(order.orderStatus) && (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-10">
                      <FiTruck className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-gray-900 text-sm">
                      Shipped
                    </p>
                    <p className="text-xs text-gray-600">
                      Your order is on the way
                    </p>
                    {order.trackingNumber && (
                      <p className="text-xs text-orange-600 font-semibold mt-1">
                        Tracking: {order.trackingNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Delivered */}
              {order.orderStatus === "DELIVERED" && (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-10">
                      <FiCheckCircle className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      Delivered
                    </p>
                    <p className="text-xs text-gray-600">
                      {order.deliveredAt
                        ? formatDate(order.deliveredAt)
                        : "Recently delivered"}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {order.orderStatus === "CANCELLED" && (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center z-10">
                      <FiXCircle className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      Order Cancelled
                    </p>
                    <p className="text-xs text-gray-600">
                      {order.cancelledAt && formatDate(order.cancelledAt)}
                    </p>
                    {order.cancellationReason && (
                      <p className="text-xs text-red-600 mt-1">
                        Reason: {order.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items - Grouped by Vendor */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Items ({order.items.length})
            </h2>

            {/* Group items by vendor */}
            {(() => {
              // Group items by vendorId
              const itemsByVendor = {};

              order.items.forEach((item) => {
                const vendorId = item.vendorId?._id || item.vendorId;
                if (!itemsByVendor[vendorId]) {
                  itemsByVendor[vendorId] = [];
                }
                itemsByVendor[vendorId].push(item);
              });

              // Find vendor info from sub-orders
              const getVendorInfo = (vendorId) => {
                const subOrder = order.subOrders?.find(
                  (so) => so.vendorId?._id?.toString() === vendorId?.toString()
                );
                return subOrder?.vendorId || null;
              };

              return (
                <div className="space-y-6">
                  {Object.entries(itemsByVendor).map(
                    ([vendorId, items], index) => {
                      const vendor = getVendorInfo(vendorId);
                      const subOrder = order.subOrders?.find(
                        (so) =>
                          so.vendorId?._id?.toString() === vendorId?.toString()
                      );

                      return (
                        <div
                          key={vendorId || index}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          {/* Vendor Header */}
                          <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                  {vendor?.businessName?.charAt(0) || "V"}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">
                                    {vendor?.businessName || "Vendor"}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {vendor?.city || "N/A"},{" "}
                                    {vendor?.state || "N/A"}
                                  </p>
                                </div>
                              </div>

                              {/* Sub-order status */}
                              {subOrder && (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                                    subOrder.orderStatus
                                  )}`}
                                >
                                  {subOrder.orderStatus}
                                </span>
                              )}
                            </div>

                            {/* Tracking Info for this vendor */}
                            {subOrder?.trackingNumber && (
                              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-xs text-orange-800">
                                  <FiTruck className="w-4 h-4" />
                                  <span className="font-semibold">
                                    Tracking:
                                  </span>
                                  <span>{subOrder.trackingNumber}</span>
                                </div>
                                {subOrder.estimatedDelivery && (
                                  <p className="text-xs text-orange-700 mt-1 ml-6">
                                    Est. Delivery:{" "}
                                    {formatDate(subOrder.estimatedDelivery)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Vendor's Products */}
                          <div className="p-4 space-y-3">
                            {items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-100">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FiPackage className="text-gray-300 w-8 h-8" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 mb-1">
                                    {item.name}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Quantity: {item.quantity}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                      {formatCurrency(item.price)} ×{" "}
                                      {item.quantity}
                                    </p>
                                    <p className="text-lg font-bold text-orange-600">
                                      {formatCurrency(
                                        item.price * item.quantity
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Vendor Subtotal */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                              <span className="text-sm font-semibold text-gray-700">
                                Subtotal from{" "}
                                {vendor?.businessName || "this vendor"}:
                              </span>
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(
                                  items.reduce(
                                    (sum, item) =>
                                      sum + item.price * item.quantity,
                                    0
                                  )
                                )}
                              </span>
                            </div>

                            {/* Contact Vendor Button */}

                            <div className="flex gap-2 pt-3">
                              {/* ✅ Use vendor.userId.phone */}
                              {vendor?.userId?.phone && (
                                <a
                                  href={`tel:${vendor.userId.phone}`}
                                  className="flex-1 py-2 border border-green-500 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <FiPhone className="w-3 h-3" />
                                  Call Vendor
                                </a>
                              )}
                              {/* ✅ Use vendor.userId.email */}
                              {vendor?.userId?.email && (
                                <a
                                  href={`mailto:${vendor.userId.email}`}
                                  className="flex-1 py-2 border border-blue-500 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <FiMail className="w-3 h-3" />
                                  Email Vendor
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              );
            })()}
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiMapPin className="text-orange-500 w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Address
              </h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">
                {order.shippingAddress.fullName}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                {order.shippingAddress.phone}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                {order.shippingAddress.address}
              </p>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.state}
                {order.shippingAddress.zipCode &&
                  ` ${order.shippingAddress.zipCode}`}
              </p>
              {order.shippingAddress.additionalInfo && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  Note: {order.shippingAddress.additionalInfo}
                </p>
              )}
            </div>
          </div>

          {/* Vendor Info */}
          {/* All Vendors Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiPackage className="text-green-500 w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-900">
                Vendors ({order.subOrders?.length || 0})
              </h2>
            </div>

            <div className="space-y-3">
              {order.subOrders?.map((subOrder, index) => {
                const vendor = subOrder.vendorId;
                const user = vendor?.userId; // ✅ Get user profile

                if (!vendor) return null;

                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {vendor.businessName?.charAt(0) || "V"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {vendor.businessName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {vendor.city}, {vendor.state}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* ✅ Use user.phone instead of vendor.phone */}
                      {user?.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FiPhone className="w-3 h-3" />
                          <span>{user.phone}</span>
                        </div>
                      )}

                      {/* ✅ Use user.email instead of vendor.email */}
                      {user?.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FiMail className="w-3 h-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}

                      {vendor.calculatedRating > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <FiStar className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="font-semibold text-gray-900">
                            {vendor.calculatedRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({vendor.calculatedTotalReviews}{" "}
                            {vendor.calculatedTotalReviews === 1
                              ? "review"
                              : "reviews"}
                            )
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Order Status for this vendor */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Order Status:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            subOrder.orderStatus
                          )}`}
                        >
                          {subOrder.orderStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold text-gray-900">
                  {order.deliveryFee === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    formatCurrency(order.deliveryFee)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-600">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <FiTruck className="text-orange-500 w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.paymentMethod === "CASH_ON_DELIVERY"
                      ? "Cash on Delivery"
                      : order.paymentMethod}
                  </p>
                  <p className="text-xs text-gray-600">
                    Payment Status:{" "}
                    <span
                      className={
                        order.paymentStatus === "PAID"
                          ? "text-green-600 font-semibold"
                          : "text-yellow-600 font-semibold"
                      }
                    >
                      {order.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Dispute Status Info */}
            {order.dispute?.isDisputed && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                  <FiAlertCircle className="w-4 h-4" />
                  <span>Order Disputed</span>
                </div>
                <p className="text-xs text-red-600 mb-1">Reason: {order.dispute.reason}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase font-bold text-red-500">Status: {order.dispute.status}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            {order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "PENDING" && order.orderStatus !== "CANCELLED" && (
              <button
                onClick={handleCODPayment}
                disabled={isProcessingPayment}
                className="w-full mb-3 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <FiClock className="w-4 h-4" />
                )}
                Pay Now (Online)
              </button>
            )}

            {canCancelOrder(order.orderStatus) && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-3 border-2 text-xs border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiXCircle className="w-4 h-4" />
                Cancel Order
              </button>
            )}

            {order.orderStatus === "DELIVERED" && (
              <Link
                href={`/dashboard/customer/products/${order.items[0]?.productId}`}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <FiPackage className="w-4 h-4" />
                Leave a Review
              </Link>
            )}

            {/* Dispute Button */}
            {!order.dispute?.isDisputed && order.orderStatus !== 'CANCELLED' && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="w-full mt-3 py-3 border-2 border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <FiMessageSquare className="w-4 h-4" />
                Report a Problem
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="text-red-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Order?</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this order? This action cannot be
              undone.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please tell us why you're cancelling..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-3 border text-xs border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Order"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="text-orange-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Report a Problem</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Tell us what's wrong with your order. Our admin team will review it and assist you.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Reason</label>
                <select 
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select a reason</option>
                  <option value="Damaged Items">Items arrived damaged</option>
                  <option value="Missing Items">Some items are missing</option>
                  <option value="Wrong Items">Received wrong items</option>
                  <option value="Poor Quality">Quality not as expected</option>
                  <option value="Not Delivered">Order marked as delivered but not received</option>
                  <option value="Other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Detailed Message</label>
                <textarea
                  value={disputeMessage}
                  onChange={(e) => setDisputeMessage(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisputeModal(false)}
                disabled={submittingDispute}
                className="flex-1 py-3 border text-xs border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDispute}
                disabled={submittingDispute}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingDispute ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
