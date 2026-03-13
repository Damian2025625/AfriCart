"use client";

import React, { useState, useEffect } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiShoppingBag,
  FiBox,
  FiUsers,
  FiCalendar,
  FiArrowUpRight,
  FiDownload,
  FiClock,
  FiChevronDown,
  FiZap,
  FiStar,
  FiRefreshCcw,
  FiPieChart,
  FiActivity,
  FiAward,
  FiBarChart2,
} from "react-icons/fi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import toast from "react-hot-toast";

export default function VendorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState("weekly");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/vendor/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        toast.error(data.message || "Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
      toast.error("An error occurred while loading analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExport = async () => {
    if (!analytics) {
      toast.error("No analytics data to export");
      return;
    }
    try {
      toast.loading("Generating comprehensive PDF report (all periods)…", { id: "export" });
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/vendor/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analytics, timeRange }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Africart-Analytics-All-Periods-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF report downloaded! (Daily · Weekly · Monthly · Quarterly · Yearly)", { id: "export", duration: 5000 });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analytics", { id: "export" });
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  if (loading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500" />
            <div className="absolute inset-3 bg-gradient-to-br from-orange-500 to-green-600 rounded-full animate-pulse flex items-center justify-center">
              <FiTrendingUp className="text-white text-xl sm:text-2xl" />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Analyzing Data</h3>
          <p className="text-gray-600 text-sm animate-pulse">Gathering insights...</p>
        </div>
      </div>
    );
  }

  const data = analytics;

  return (
    <div className="min-h-screen w-full py-4 sm:py-6 max-w-screen-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col gap-5 mb-8">
        {/* Title row */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-orange-500 mb-0.5 truncate pr-2">
              Business Intelligence
            </h1>
            <p className="text-gray-500 text-[10px] sm:text-xs truncate">
              Strategic insights for {data?.settlements?.businessName || "your shop"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end xs:self-center shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-orange-500 transition-colors shadow-sm"
              aria-label="Refresh"
            >
              <FiRefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-600 font-bold transition-colors text-[10px] sm:text-xs whitespace-nowrap shadow-sm shadow-orange-500/5"
            >
              <FiDownload size={12} />
              <span>EXPORT REPORT</span>
            </button>
          </div>
        </div>

        {/* Time-range tabs */}
        <div className="w-full -mx-3 px-3 overflow-x-auto no-scrollbar">
          <div className="bg-white border border-gray-100 rounded-xl p-1 flex w-fit gap-1 shadow-sm">
            {["daily", "weekly", "monthly", "quarterly", "yearly"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  timeRange === range
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                    : "text-gray-500 hover:text-orange-500 hover:bg-gray-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(data?.overview?.totalRevenue),
            icon: FiDollarSign,
            color: "orange",
            change: data?.overview?.revenueChange,
          },
          {
            label: "Total Orders",
            value: data?.overview?.totalOrders,
            icon: FiShoppingBag,
            color: "green",
            change: data?.overview?.ordersChange,
          },
          {
            label: "Ledger Balance",
            value: formatCurrency(data?.settlements?.ledgerBalance),
            icon: FiAward,
            color: "blue",
            sub: "Verified Earnings",
          },
          {
            label: "Next Payout",
            value: formatCurrency(data?.settlements?.pendingBalance),
            icon: FiClock,
            color: "purple",
            sub: `Est: ${data?.settlements?.nextSettlementDate}`,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-gray-500 text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-1 leading-tight">
                  {stat.label}
                </p>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-1.5 sm:p-2 md:p-2.5 bg-${stat.color}-50 rounded-xl shrink-0`}>
                <stat.icon className={`text-${stat.color}-600 text-base sm:text-lg`} />
              </div>
            </div>
            {stat.change !== undefined ? (
              <div
                className={`flex items-center text-[8px] sm:text-[9px] md:text-[10px] font-bold ${
                  stat.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.change >= 0 ? (
                  <FiTrendingUp className="mr-1 shrink-0" />
                ) : (
                  <FiTrendingDown className="mr-1 shrink-0" />
                )}
                <span>{Math.abs(stat.change || 0).toFixed(1)}% vs prior</span>
              </div>
            ) : (
              <p className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-400 font-medium truncate">
                {stat.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">

        {/* Revenue Velocity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 md:p-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Revenue Velocity</h3>
            <p className="text-gray-500 text-[10px]">Track your sales performance</p>
          </div>
          <div className="h-52 sm:h-64 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                  tickFormatter={(val) => `₦${val >= 1000 ? val / 1000 + "k" : val}`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    padding: "10px",
                    fontSize: "11px",
                  }}
                  labelStyle={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "12px", color: "#f97316", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Share / Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 md:p-6">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5">Market Share</h3>
          <p className="text-gray-500 text-[10px] mb-4 sm:mb-6">Sales by category</p>

          <div className="relative h-44 sm:h-52 md:h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius="38%"
                  outerRadius="55%"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.salesByCategory?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                {data?.totalItemsSold}
              </span>
              <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                Units Sold
              </span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 space-y-2">
            {data?.salesByCategory?.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                <div className="flex items-center gap-2 text-gray-700 min-w-0">
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className="text-gray-400 ml-2 shrink-0">
                  {Math.round((cat.value / (data.totalItemsSold || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Settlement Ledger ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-50 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">Settlement Ledger</h3>
          <div className="text-[9px] sm:text-[10px] font-bold text-gray-500 px-2.5 sm:px-3 py-1 bg-gray-50 rounded-lg self-start xs:self-auto whitespace-nowrap">
            Total Settled: {formatCurrency(data?.settlements?.totalSettled)}
          </div>
        </div>

        {/* Table — horizontally scrollable on small screens */}
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-left text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3 sm:py-4">Reference</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Processed Date</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {data?.recentSettlements
                ?.filter((s) => s.id !== "none")
                .map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-[10px] sm:text-xs">{s.reference}</span>
                        <span className="text-[8px] sm:text-[9px] text-gray-400">
                          {s.bankName || data?.settlements?.bankName} •{" "}
                          {s.accountNumber || data?.settlements?.accountNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 font-medium text-[10px] sm:text-xs whitespace-nowrap">
                      {s.date || "Processing..."}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          s.status?.toLowerCase() === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-gray-900 text-[10px] sm:text-xs whitespace-nowrap">
                      {formatCurrency(s.amount)}
                    </td>
                  </tr>
                ))}
              {(!data?.recentSettlements ||
                data?.recentSettlements?.filter((s) => s.id !== "none").length === 0) && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 sm:py-12 text-center text-gray-500">
                    <FiBox className="mx-auto text-3xl sm:text-4xl mb-2 text-gray-300" />
                    <p className="text-xs">No settlement history found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Insight Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Smart Recommendation */}
        <div className="bg-gradient-to-br from-orange-500 to-green-600 rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm">
              <FiZap className="fill-current shrink-0" /> Smart Recommendation
            </div>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
              {data?.smartInsights?.[0] ||
                "Your conversion rate is highest on weekends. Consider running promotions on Saturdays!"}
            </p>
          </div>
          <a
            href="/dashboard/vendor/products"
            className="self-start mt-4 text-[10px] sm:text-xs font-bold bg-white text-orange-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:shadow-lg transition-all"
          >
            Optimize Catalog
          </a>
        </div>

        {/* Performance Tracker */}
        <div className="bg-gray-900 rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-between min-h-[140px] sm:min-h-[160px] overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 font-bold text-orange-400 text-sm">
              <FiBarChart2 className="shrink-0" /> Performance Tracker
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-medium">
              You've reached more customers this period than 60% of vendors in your category.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 mt-4 text-green-400 font-bold text-xs sm:text-sm">
            <FiActivity className="shrink-0" /> Top Tier Vendor Profile
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
}