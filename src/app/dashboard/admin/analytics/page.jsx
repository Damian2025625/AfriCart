"use client";

import { useState, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiTrendingDown,
  FiShoppingBag,
  FiUsers,
  FiDollarSign,
  FiRefreshCw,
  FiCalendar,
  FiPieChart,
  FiStar,
  FiArrowUpRight,
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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.analytics);
      } else {
        toast.error(result.message || "Failed to load analytics");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-80 bg-gray-200 rounded-2xl" />
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed performance metrics and growth trends</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {[
            { label: "7D", value: "7d" },
            { label: "30D", value: "30d" },
            { label: "90D", value: "90d" },
            { label: "12M", value: "12m" },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeRange === range.value
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {range.label}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-gray-200 mx-1" />
          <button
            onClick={fetchAnalytics}
            className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Primary Row: Revenue Trend */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Revenue Growth</h2>
            <p className="text-xs text-gray-500">Gross Merchandise Value (GMV) over time</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">
                <FiArrowUpRight /> 12.5%
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.revenueTrend}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="_id" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(val) => `₦${val >= 1000 ? val/1000 + 'k' : val}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val) => [formatCurrency(val), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Product Distribution</h2>
            <p className="text-xs text-gray-500">Total product listings by category</p>
          </div>
          <div className="h-[250px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Top Vendors</h2>
              <p className="text-xs text-gray-500">Highest grossing stores this period</p>
            </div>
            <FiStar className="text-yellow-400 text-xl" />
          </div>
          <div className="flex flex-col gap-4">
            {data?.topVendors.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
            ) : (
                data?.topVendors.map((vendor, i) => (
                    <div key={vendor.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                                {i + 1}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{vendor.name}</p>
                                <p className="text-[10px] text-gray-500">{vendor.orders} orders processed</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-purple-600">{formatCurrency(vendor.revenue)}</p>
                            <p className="text-[10px] text-gray-400">Total Sales</p>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* User Growth */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">User Growth</h2>
          <p className="text-xs text-gray-500">New vendor and customer signups</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.revenueTrend.map(d => {
                const vendorData = data.growth.vendors.find(v => v._id === d._id);
                const customerData = data.growth.customers.find(c => c._id === d._id);
                return {
                    date: d._id,
                    vendors: vendorData ? vendorData.count : 0,
                    customers: customerData ? customerData.count : 0
                };
            })}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" />
              <Bar dataKey="customers" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="vendors" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
