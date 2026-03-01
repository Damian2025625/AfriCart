"use client";

import React, { useState, useEffect } from "react";
import {
  FiArrowLeft,
  FiPackage,
  FiMapPin,
  FiPhone,
  FiMail,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiBox,
  FiEdit3,
  FiSave,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";

export default function VendorOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderNumber = params.orderNumber;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");

  useEffect(() => {
    fetchOrderDetails();
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`/api/vendor/orders/${orderNumber}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
        setVendorNotes(data.order.vendorNotes || "");
        setTrackingNumber(data.order.trackingNumber || "");
        setEstimatedDelivery(
          data.order.estimatedDelivery
            ? new Date(data.order.estimatedDelivery)
                .toISOString()
                .split("T")[0]
            : ""
        );
      } else {
        toast.error(data.message || "Order not found");
        router.push("/dashboard/vendor/orders");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    setUpdating(true);

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/vendor/orders/${orderNumber}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: selectedStatus,
            trackingNumber: trackingNumber || undefined,
            estimatedDelivery: estimatedDelivery || undefined,
            vendorNotes: vendorNotes || undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Order status updated successfully");
        setShowStatusModal(false);
        fetchOrderDetails();
      } else {
        toast.error(data.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
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
      CANCELLED: FiX,
    };
    return icons[status] || FiPackage;
  };

  const availableStatuses = [
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "DELIVERED", label: "Delivered" },
  ];

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
          <button
            onClick={() => router.push("/dashboard/vendor/orders")}
            className="text-orange-500 hover:text-orange-600"
          >
            Back to orders
          </button>
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
            {order.orderStatus !== "DELIVERED" &&
              order.orderStatus !== "CANCELLED" && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                  <FiEdit3 className="w-4 h-4" />
                  Update Status
                </button>
              )}
          </div>
        </div>

        {/* Payment Info Banner */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Payment Method
            </p>
            <p className="text-xs text-gray-600">
              {order.paymentMethod === "CASH_ON_DELIVERY"
                ? "Cash on Delivery"
                : order.paymentMethod}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Payment Status
            </p>
            <p
              className={`text-xs font-bold ${
                order.paymentStatus === "PAID"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {order.paymentStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Items ({order.items.length})
            </h2>

            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-gray-50 rounded-lg"
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
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiUser className="text-orange-500 w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-900">
                Customer Information
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    {order.customerId?.firstName?.charAt(0) || "C"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.customerId?.firstName} {order.customerId?.lastName}
                    </p>
                    <p className="text-xs text-gray-600">Customer</p>
                  </div>
                </div>

                {order.customerId?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <FiPhone className="w-4 h-4" />
                    <span>{order.customerId.phone}</span>
                  </div>
                )}

                {order.customerId?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMail className="w-4 h-4" />
                    <span>{order.customerId.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiMapPin className="text-green-500 w-5 h-5" />
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

          {/* Tracking Information */}
          {order.trackingNumber && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiTruck className="text-orange-600 w-5 h-5" />
                <h3 className="font-semibold text-orange-900">
                  Tracking Information
                </h3>
              </div>
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Tracking Number:</span>{" "}
                {order.trackingNumber}
              </p>
              {order.estimatedDelivery && (
                <p className="text-sm text-orange-800 mt-1">
                  <span className="font-semibold">Estimated Delivery:</span>{" "}
                  {formatDate(order.estimatedDelivery)}
                </p>
              )}
            </div>
          )}

          {/* Vendor Notes */}
          {order.vendorNotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Internal Notes
              </h3>
              <p className="text-sm text-blue-800">{order.vendorNotes}</p>
            </div>
          )}
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

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Quick Actions
              </h3>

              {order.orderStatus === "PENDING" && (
                <button
                  onClick={() => {
                    setSelectedStatus("CONFIRMED");
                    setShowStatusModal(true);
                  }}
                  className="w-full py-3 bg-blue-500 text-sm text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Confirm Order
                </button>
              )}

              {order.orderStatus === "CONFIRMED" && (
                <button
                  onClick={() => {
                    setSelectedStatus("PROCESSING");
                    setShowStatusModal(true);
                  }}
                  className="w-full py-3 bg-purple-500 text-sm text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiBox className="w-4 h-4" />
                  Start Processing
                </button>
              )}

              {order.orderStatus === "PROCESSING" && (
                <button
                  onClick={() => {
                    setSelectedStatus("SHIPPED");
                    setShowStatusModal(true);
                  }}
                  className="w-full py-3 bg-orange-500 text-sm text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiTruck className="w-4 h-4" />
                  Mark as Shipped
                </button>
              )}

              {order.orderStatus === "SHIPPED" && (
                <button
                  onClick={() => {
                    setSelectedStatus("DELIVERED");
                    setShowStatusModal(true);
                  }}
                  className="w-full py-3 bg-green-500 text-sm text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Mark as Delivered
                </button>
              )}

              
              <a
                href={`mailto:${order.customerId?.email}`}
                className="w-full py-3 border-2 border-gray-300 text-sm text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiMail className="w-4 h-4" />
                Contact Customer
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Update Order Status
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Status *
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select status...</option>
                  {availableStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Number */}
              {(selectedStatus === "SHIPPED" ||
                selectedStatus === "DELIVERED") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g., DHL12345678"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Estimated Delivery */}
              {selectedStatus === "SHIPPED" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estimated Delivery Date
                  </label>
                  <input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Vendor Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <textarea
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  placeholder="Add any internal notes about this order..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating || !selectedStatus}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? (
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
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Update Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}