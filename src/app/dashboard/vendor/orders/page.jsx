"use client";

import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiEye,
  FiBox,
  FiEdit3,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const tabs = [
    { id: "ALL", label: "All Orders", icon: FiPackage },
    { id: "PENDING", label: "Pending", icon: FiClock },
    { id: "CONFIRMED", label: "Confirmed", icon: FiCheckCircle },
    { id: "PROCESSING", label: "Processing", icon: FiBox },
    { id: "SHIPPED", label: "Shipped", icon: FiTruck },
    { id: "DELIVERED", label: "Delivered", icon: FiCheckCircle },
    { id: "CANCELLED", label: "Cancelled", icon: FiXCircle },
  ];

  useEffect(() => {
    fetchOrders(1);
  }, [activeTab]);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      const statusParam = activeTab !== "ALL" ? `&status=${activeTab}` : "";
      const response = await fetch(`/api/vendor/orders?page=${page}&limit=10${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        setTotalPages(data.pages || 1);
        setCurrentPage(data.page || 1);
        setTotalOrders(data.total || (data.orders?.length || 0));
      } else {
        toast.error(data.message || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderNumber, newStatus) => {
    setUpdatingOrder(orderNumber);

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
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Order status updated successfully");
        fetchOrders();
      } else {
        toast.error(data.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setUpdatingOrder(null);
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
      month: "short",
      day: "numeric",
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

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PROCESSING",
      PROCESSING: "SHIPPED",
      SHIPPED: "DELIVERED",
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      PENDING: "Confirm Order",
      CONFIRMED: "Start Processing",
      PROCESSING: "Mark as Shipped",
      SHIPPED: "Mark as Delivered",
    };
    return labels[currentStatus];
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerId?.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.customerId?.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Orders Management
        </h1>
        <p className="text-gray-600 text-sm">
          Manage and track all your customer orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-600 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>

        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
          <p className="text-xs text-yellow-700 mb-1">Page Results</p>
          <p className="text-2xl font-bold text-yellow-700">
            {orders.length}
          </p>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-100">
          <p className="text-xs text-orange-700 mb-1">Status Filter</p>
          <p className="text-2xl font-bold text-orange-700">
            {activeTab === "ALL" ? "None" : activeTab}
          </p>
        </div>

        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
          <p className="text-xs text-green-700 mb-1">Current Page</p>
          <p className="text-2xl font-bold text-green-700">
            {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order number or customer name..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2 items-center justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            // The total count is only available for the ACTIVE tab via API.total
            // For others, we don't know the exact count without separate API calls.
            // Let's show the count for ALL if selected, otherwise just the tab label.
            const count = (tab.id === "ALL" && activeTab === "ALL") || (tab.id === activeTab) ? totalOrders : 0;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-orange-500"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{tab.label}</span>
                {count > 0 && activeTab === tab.id && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id
                        ? "bg-white text-orange-500"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPackage className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No orders found
          </h2>
          <p className="text-gray-600 text-sm">
            {activeTab === "ALL"
              ? "You haven't received any orders yet"
              : `No ${activeTab.toLowerCase()} orders`}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Items
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/vendor/orders/${order.orderNumber}`}
                          className="font-semibold text-orange-600 hover:text-orange-700 text-xs"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">
                            {order.customerId?.firstName}{" "}
                            {order.customerId?.lastName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {order.shippingAddress.city}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-900">
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 text-xs">
                          {formatCurrency(order.total)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            order.orderStatus
                          )}`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {getNextStatus(order.orderStatus) && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(
                                  order.orderNumber,
                                  getNextStatus(order.orderStatus)
                                )
                              }
                              disabled={updatingOrder === order.orderNumber}
                              className="px-3 py-2 bg-green-500 text-white rounded-lg text-[10px] font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5"
                            >
                              {updatingOrder === order.orderNumber ? (
                                <svg
                                  className="animate-spin h-3 w-3"
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
                              ) : (
                                <>
                                  <FiCheckCircle className="w-3 h-3" />
                                  <p className="line-clamp-1">{getNextStatusLabel(order.orderStatus)}</p>
                                </>
                              )}
                            </button>
                          )}

                          <Link
                            href={`/dashboard/vendor/orders/${order.orderNumber}`}
                            className="px-3 py-2 border border-orange-500 text-orange-500 rounded-lg text-[10px] font-semibold hover:bg-orange-50 transition-colors flex items-center gap-1"
                          >
                            <FiEye className="w-3 h-3" />
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <button
                onClick={() => fetchOrders(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Only show current page, first, last, and relative pages if totalPages > 5
                  if (
                    totalPages <= 5 ||
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchOrders(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? "bg-orange-500 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === 2 && currentPage > 3) ||
                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={pageNum} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => fetchOrders(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}