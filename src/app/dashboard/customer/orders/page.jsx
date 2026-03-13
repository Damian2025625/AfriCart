"use client";

import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiFilter,
  FiEye,
  FiBox,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: "ALL", label: "All Orders", icon: FiPackage },
    { id: "PENDING", label: "Pending", icon: FiClock },
    { id: "PROCESSING", label: "Processing", icon: FiBox },
    { id: "SHIPPED", label: "Shipped", icon: FiTruck },
    { id: "DELIVERED", label: "Delivered", icon: FiCheckCircle },
    { id: "CANCELLED", label: "Cancelled", icon: FiXCircle },
  ];

  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    fetchOrders(1);
  }, [activeTab]);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(null);
    // Scrolled to top on page change
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (page === 1) setIsInitializing(currentPage === 1);
    
    try {
      const token = localStorage.getItem("authToken");
      if (!token) { router.push("/login"); return; }

      const statusParam = activeTab !== "ALL" ? `&status=${activeTab}` : "";
      const response = await fetch(`/api/customer/orders?page=${page}&limit=5${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        setTotalPages(data.pages || 1);
        setCurrentPage(data.page || 1);
        setTotalOrders(data.total || 0);
      } else {
        throw new Error(data.message || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(error.message);
      toast.error(error.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setIsInitializing(false);
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

  const filteredOrders = orders.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="mb-6 h-12 bg-gray-50 rounded-xl animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-48 border border-gray-100 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <FiXCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">{error}</p>
        <button
          onClick={() => fetchOrders(1)}
          className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg flex items-center gap-2"
        >
          <FiPackage /> Retry Loading Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
          <p className="text-gray-600 text-xs">
            Showing {totalOrders} total {totalOrders === 1 ? 'order' : 'orders'}
          </p>
        </div>
        {loading && !isInitializing && (
          <div className="flex items-center gap-2 text-orange-500">
            <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full"/>
            <span className="text-[10px] font-bold uppercase tracking-wider">Refreshing...</span>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order number..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2 items-center justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPackage className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No orders found
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            {activeTab === "ALL"
              ? "You haven't placed any orders yet"
              : `No ${activeTab.toLowerCase()} orders`}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-sm"
          >
            <FiPackage className="w-4 h-4" />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="p-4 sm:p-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {order.orderNumber}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span>Placed on {formatDate(order.createdAt)}</span>
                      <span>•</span>
                      <span className="font-semibold">
                        {order.items?.length || 0} {order.items?.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/customer/orders/${order.orderNumber}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-xs self-start sm:self-auto"
                  >
                    <FiEye className="w-4 h-4" />
                    View Details
                  </Link>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {(order.items || []).slice(0, 2).map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPackage className="text-gray-300 w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-gray-600">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                        <p className="text-sm font-bold text-orange-600">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 2 && (
                    <p className="text-xs text-gray-500 italic">
                      +{(order.items?.length || 0) - 2} more items
                    </p>
                  )}
                </div>

                {/* Order Total */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    Order Total:
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Robust Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-10 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(1)}
                  disabled={currentPage === 1 || loading}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  title="First Page"
                >
                  <FiChevronsLeft size={16}/>
                </button>
                <button
                  onClick={() => fetchOrders(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  title="Previous Page"
                >
                  <FiChevronLeft size={16}/>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-none pb-2 sm:pb-0">
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  // Window logic: show 2 pages around current
                  if (totalPages > 5) {
                    if (p !== 1 && p !== totalPages && (p < currentPage - 1 || p > currentPage + 1)) {
                      if (p === 2 && currentPage > 3) return <span key={p} className="text-gray-300 px-1">...</span>;
                      if (p === totalPages - 1 && currentPage < totalPages - 2) return <span key={p} className="text-gray-300 px-1">...</span>;
                      return null;
                    }
                  }

                  return (
                    <button
                      key={p}
                      onClick={() => fetchOrders(p)}
                      disabled={loading}
                      className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                        currentPage === p
                          ? "bg-orange-500 text-white shadow-lg scale-110"
                          : "bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-500"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  title="Next Page"
                >
                  <FiChevronRight size={16}/>
                </button>
                <button
                  onClick={() => fetchOrders(totalPages)}
                  disabled={currentPage === totalPages || loading}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  title="Last Page"
                >
                  <FiChevronsRight size={16}/>
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              Showing Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Additional icons
import { FiPlusCircle, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";