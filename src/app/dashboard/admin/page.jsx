"use client";

import { useState, useEffect } from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { RiStoreLine } from "react-icons/ri";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${Math.round(amount).toLocaleString()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES = {
  PENDING:    { bg: "bg-yellow-100",  text: "text-yellow-700",  icon: FiClock,       label: "Pending" },
  CONFIRMED:  { bg: "bg-blue-100",    text: "text-blue-700",    icon: FiCheckCircle, label: "Confirmed" },
  PROCESSING: { bg: "bg-indigo-100",  text: "text-indigo-700",  icon: FiRefreshCw,   label: "Processing" },
  SHIPPED:    { bg: "bg-purple-100",  text: "text-purple-700",  icon: FiPackage,     label: "Shipped" },
  DELIVERED:  { bg: "bg-green-100",   text: "text-green-700",   icon: FiCheckCircle, label: "Delivered" },
  CANCELLED:  { bg: "bg-red-100",     text: "text-red-700",     icon: FiXCircle,     label: "Cancelled" },
};

const PAYMENT_STYLES = {
  PAID:    { bg: "bg-green-100",  text: "text-green-700",  label: "Paid" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  FAILED:  { bg: "bg-red-100",    text: "text-red-700",    label: "Failed" },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, iconBg, trend, trendLabel }) {
  const isUp = trend >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 leading-tight">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="text-[10px] text-gray-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="text-xl text-white" />
        </div>
      </div>
      {trendLabel !== undefined && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}>
          {isUp ? <FiTrendingUp /> : <FiTrendingDown />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status, type = "order" }) {
  const styles = type === "payment" ? PAYMENT_STYLES : STATUS_STYLES;
  const style = styles[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}>
      {Icon && <Icon className="text-xs" />}
      {style.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      } else {
        setError(data.message || "Failed to load stats");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-72 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <FiAlertCircle className="text-5xl text-red-400" />
        <p className="text-gray-600 font-medium">{error}</p>
        <button
          onClick={fetchStats}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  const { vendors, customers, orders, revenue, products } = stats;

  // Order growth %
  const orderGrowth = orders.lastMonth > 0
    ? (((orders.thisMonth - orders.lastMonth) / orders.lastMonth) * 100).toFixed(1)
    : orders.thisMonth > 0 ? 100 : 0;

  const statusOrder = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-bold">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-purple-200">
              <FiShield className="text-white text-[10px]" />
            </div>
            <span className="text-[10px] text-purple-600 uppercase tracking-widest">Master Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Admin Intelligence</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm active:scale-95"
        >
          <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          <span>SYNC SYSTEM</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Vendors", value: vendors.total, sub: `${vendors.newThisMonth} new`, icon: RiStoreLine, bg: "from-orange-400 to-orange-600", trend: vendors.newThisMonth, label: `+${vendors.newThisMonth} month` },
          { title: "Total Customers", value: customers.total, sub: `${customers.newThisMonth} new`, icon: FiUsers, bg: "from-blue-500 to-blue-700", trend: customers.newThisMonth, label: `+${customers.newThisMonth} month` },
          { title: "Total Orders", value: orders.total, sub: `${orders.thisMonth} month`, icon: FiPackage, bg: "from-indigo-500 to-indigo-700", trend: orderGrowth, label: `${orderGrowth}% growth` },
          { title: "Commission", value: formatCurrency(revenue.platform), sub: `${formatCurrency(revenue.total)} GMV`, icon: FiDollarSign, bg: "from-green-500 to-green-700", trend: 1, label: "Live Stats" }
        ].map((stat, i) => (
          <StatCard
            key={i}
            title={stat.title}
            value={stat.value.toLocaleString()}
            subtitle={stat.sub}
            icon={stat.icon}
            iconBg={`bg-gradient-to-br ${stat.bg}`}
            trend={stat.trend}
            trendLabel={stat.label}
          />
        ))}
      </div>

      {/* Paystack Live Balance Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
        revenue.paystackBalanceFetched
          ? "bg-green-50 border-green-200"
          : "bg-gray-50 border-gray-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            revenue.paystackBalanceFetched ? "bg-green-600" : "bg-gray-400"
          }`}>
            <FiDollarSign className="text-white text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Paystack Wallet Balance</p>
              {revenue.paystackBalanceFetched ? (
                <span className="px-1.5 py-0.5 bg-green-600 text-white rounded-full text-[9px] font-bold uppercase tracking-wide animate-pulse">
                  LIVE
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-gray-400 text-white rounded-full text-[9px] font-bold uppercase tracking-wide">
                  UNAVAILABLE
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {revenue.paystackBalanceFetched
                ? "Current available funds in your Africart Paystack account · Fetched live from Paystack API"
                : "Could not reach Paystack API right now — revenue figures below are still accurate"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {revenue.paystackBalanceFetched ? (
            <p className="text-2xl font-bold text-green-700">{formatCurrency(revenue.paystackWalletBalance)}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">—</p>
          )}
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Order Status Breakdown</h2>
          <div className="flex flex-col gap-3">
            {statusOrder.map((status) => {
              const count = orders.statusBreakdown[status] || 0;
              const pct = orders.total > 0 ? ((count / orders.total) * 100).toFixed(0) : 0;
              const style = STATUS_STYLES[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
              const barColors = {
                PENDING: "bg-yellow-400",
                CONFIRMED: "bg-blue-500",
                PROCESSING: "bg-indigo-500",
                SHIPPED: "bg-purple-500",
                DELIVERED: "bg-green-500",
                CANCELLED: "bg-red-400",
              };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold ${style.text}`}>{style.label}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`${barColors[status]} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unverified Vendors</p>
            <p className="text-3xl font-bold text-orange-600">{vendors.pending}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting verification</p>
            <a href="/dashboard/admin/vendors" className="mt-3 inline-block text-xs font-semibold text-purple-600 hover:underline">
              Review →
            </a>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Products</p>
            <p className="text-3xl font-bold text-indigo-600">{products.total.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Listed on platform</p>
            <a href="/dashboard/admin/analytics" className="mt-3 inline-block text-xs font-semibold text-purple-600 hover:underline">
              Analyse →
            </a>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Orders This Month</p>
            <p className="text-3xl font-bold text-blue-600">{orders.thisMonth}</p>
            <p className={`text-xs mt-1 font-semibold ${parseFloat(orderGrowth) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {orderGrowth > 0 ? "↑" : "↓"} {Math.abs(orderGrowth)}% vs last month
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Delivered Orders</p>
            <p className="text-3xl font-bold text-green-600">{orders.statusBreakdown?.DELIVERED || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Successfully fulfilled</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>
          <a href="/dashboard/admin/orders" className="text-xs font-semibold text-purple-600 hover:underline">
            View all →
          </a>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
            <FiPackage className="text-4xl" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 text-xs">{order.orderNumber}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">₦{(order.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={order.orderStatus} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={order.paymentStatus} type="payment" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
