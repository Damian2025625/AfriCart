"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Users,
  CreditCard,
  Zap,
  Package,
  Building2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";

export default function VendorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState("weekly");
  const [refreshing, setRefreshing] = useState(false);

  const timeRanges = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/vendor/analytics?timeRange=${timeRange}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
        console.log("📊 Analytics loaded:", data.analytics);
      } else {
        toast.error(data.message || "Failed to load analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
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
        body: JSON.stringify({
          analytics,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Africart-Analytics-All-Periods-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF report downloaded! (Daily · Weekly · Monthly · Quarterly · Yearly)", { id: "export", duration: 5000 });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analytics", { id: "export" });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600 mb-6">Unable to load analytics data</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const data = analytics;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Analytics</h1>
            <p className="text-gray-600">Real-time business insights</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-1 flex gap-1">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range.value
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button 
              onClick={handleExport}
              disabled={refreshing}
              className="px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Settlement Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {/* Card 1: Already sent to bank (Paystack /settlement records) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            {data.settlements.totalSettled > 0 && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Disbursed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Sent to Bank</p>
          <p className="text-xs text-gray-400 mb-2">From Paystack settlement records</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(data.settlements.totalSettled)}
          </h3>
          <p className="text-xs text-gray-500">
            {data.settlements.bankName
              ? `${data.settlements.bankName} • ${data.settlements.accountNumber}`
              : 'Bank account not linked'}
          </p>
        </div>

        {/* Card 2: Earned not yet disbursed (pending settlement) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            {data.settlements.pendingBalance > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                In Transit
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">Pending Settlement</p>
          <p className="text-xs text-gray-400 mb-2">Earned – not yet disbursed by Paystack</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(data.settlements.pendingBalance)}
          </h3>
          <p className="text-xs text-gray-500">
            {data.settlements.pendingBalance > 0
              ? `Next payout: ${data.settlements.nextSettlementDate} (T+1)`
              : 'No pending payouts'}
          </p>
        </div>

        {/* Card 3: Held below minimum threshold */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            {data.settlements.onHoldBalance > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                Below Min
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">Below Settlement Threshold</p>
          <p className="text-xs text-gray-400 mb-2">Paystack holds until ≥ ₦100</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(data.settlements.onHoldBalance)}
          </h3>
          <p className="text-xs text-gray-500">
            {data.settlements.onHoldBalance > 0
              ? 'Accumulating toward ₦100 threshold'
              : 'No small amounts held'}
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              data.overview.revenueChange >= 0 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {data.overview.revenueChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3 inline" />
              ) : (
                <ArrowDownRight className="w-3 h-3 inline" />
              )}
              {formatPercent(data.overview.revenueChange)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.overview.totalRevenue)}
          </h3>
        </div>

        {/* Total in Subaccount (pending payout from Paystack wallet) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">In Paystack Wallet</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.settlements.pendingBalance)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Awaiting disbursement to bank</p>
        </div>

        {/* Total Settled */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Settled</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.settlements.totalSettled)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {data.settlements.settlementCount} settlements
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-600" />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              data.overview.ordersChange >= 0 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {data.overview.ordersChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3 inline" />
              ) : (
                <ArrowDownRight className="w-3 h-3 inline" />
              )}
              {formatPercent(data.overview.ordersChange)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Orders</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {data.overview.totalOrders}
          </h3>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Revenue Trend</h2>
            <p className="text-sm text-gray-600">Daily performance overview</p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Sales by Category</h2>
          <p className="text-sm text-gray-600 mb-6">Units sold per category</p>

          {data.salesByCategory?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
                {data.salesByCategory.map((category, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-gray-700 truncate max-w-[120px]" title={category.name}>{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{category.value} units</span>
                      <span className="text-sm font-bold text-gray-900 w-10 text-right">
                        {data.totalItemsSold > 0 ? ((category.value / data.totalItemsSold) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-gray-500">
              <PieChart className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No sales data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Settlement History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Settlement History</h2>
            <p className="text-sm text-gray-600">Auto-settlements to your bank account</p>
          </div>
        </div>

        {/* Bank Info */}
        {data.settlements.bankName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Settlement Bank Account</p>
                <p className="text-gray-900 font-medium">
                  {data.settlements.accountName || data.settlements.businessName}
                </p>
                <p className="text-sm text-gray-600">
                  {data.settlements.bankName} • {data.settlements.accountNumber}
                </p>
                {data.settlements.splitPercentage && (
                  <p className="text-xs text-emerald-600 mt-1">
                    You receive {data.settlements.splitPercentage}% of each sale
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settlement List */}
        <div className="space-y-3">
          {(() => {
            // Paystack sends settlements with status: 'success', 'processed', 'pending'
            const realSettlements = data.recentSettlements?.filter(
              (s) => s.id !== "none" && s.status !== "none"
            ) || [];

            if (realSettlements.length === 0) {
              return (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No settlement records yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Paystack will settle your balance to your bank account after each business day (T+1)
                  </p>
                </div>
              );
            }

            return realSettlements.slice(0, 10).map((settlement, index) => {
              const s = settlement.status?.toLowerCase() || "";
              const isSettled = s === "success" || s === "processed" || s === "settled" || s === "successful" || s === "completed";
              const isPending = s === "pending";

              return (
                <div
                  key={settlement.id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSettled ? "bg-emerald-100" : isPending ? "bg-blue-100" : "bg-amber-100"
                    }`}>
                      {isSettled ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isPending ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {settlement.reference}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isSettled
                            ? "bg-emerald-100 text-emerald-700"
                            : isPending
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {isSettled ? "Sent to Bank" : isPending ? "Pending" : settlement.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>📦 {settlement.transactionCount || 0} transactions</span>
                        <span>📅 {settlement.date}</span>
                        {settlement.settlementDate && (
                          <span>→ {settlement.settlementDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(settlement.amount)}
                    </p>
                    <p className="text-xs text-gray-400">Net to bank</p>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Top Products & Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Top Products</h2>
              <p className="text-sm text-gray-600">Best sellers this period</p>
            </div>
            <Star className="w-5 h-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {data.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-600">{product.sales} sales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No product data yet</p>
            )}
          </div>
        </div>

        {/* Customer Insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Customer Insights</h2>
              <p className="text-sm text-gray-600">Audience analytics</p>
            </div>
            <Users className="w-5 h-5 text-purple-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <Users className="w-8 h-8 text-purple-600 mb-3" />
              <p className="text-sm text-gray-600 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">
                {data.customerInsights.totalCustomers}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
              <p className="text-sm text-gray-600 mb-1">Returning</p>
              <p className="text-3xl font-bold text-gray-900">
                {data.customerInsights.returningCustomers}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.customerInsights.averageRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    From {data.customerInsights.totalReviews} reviews
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const rating = data.customerInsights.averageRating;
                    const filled = star <= Math.floor(rating);
                    return (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          filled
                            ? "text-amber-500 fill-amber-500"
                            : "text-gray-300"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      {data.smartInsights && data.smartInsights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Smart Insights</h2>
          </div>
          <div className="space-y-2">
            {data.smartInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-600 rounded-full mt-1.5"></div>
                <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}