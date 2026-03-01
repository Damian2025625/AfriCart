"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiSearch, FiPackage, FiRefreshCw, FiFilter,
  FiCheckCircle, FiClock, FiXCircle,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ORDER_STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const STATUS_STYLES = {
  PENDING:    { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  CONFIRMED:  { bg: "bg-blue-100",   text: "text-blue-700",   label: "Confirmed" },
  PROCESSING: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Processing" },
  SHIPPED:    { bg: "bg-purple-100", text: "text-purple-700", label: "Shipped" },
  DELIVERED:  { bg: "bg-green-100",  text: "text-green-700",  label: "Delivered" },
  CANCELLED:  { bg: "bg-red-100",    text: "text-red-700",    label: "Cancelled" },
};

const PAYMENT_STYLES = {
  PAID:    { bg: "bg-green-100",  text: "text-green-700",  label: "Paid" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  FAILED:  { bg: "bg-red-100",    text: "text-red-700",    label: "Failed" },
};

function Badge({ status, type = "order" }) {
  const styles = type === "payment" ? PAYMENT_STYLES : STATUS_STYLES;
  const s = styles[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const params = new URLSearchParams({ page });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(data.pages);
        setTotal(data.total);
      } else toast.error(data.message);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => {
    const t = setTimeout(fetchOrders, 300);
    return () => clearTimeout(t);
  }, [fetchOrders]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total orders</p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm self-start sm:self-auto">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-400 text-sm" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white cursor-pointer"
          >
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s === "ALL" ? "All Status" : s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-6 flex flex-col gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
            <FiPackage className="text-5xl" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-900 text-xs">{order.orderNumber}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-gray-900">
                        {order.customerId?.firstName} {order.customerId?.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400">{order.customerId?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">₦{(order.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5"><Badge status={order.orderStatus} /></td>
                    <td className="px-5 py-3.5"><Badge status={order.paymentStatus} type="payment" /></td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
