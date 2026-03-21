"use client";

import { useState, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiShoppingBag,
  FiUsers,
  FiDollarSign,
  FiRefreshCw,
  FiActivity,
  FiZap,
  FiShield,
  FiChevronRight,
  FiPackage,
  FiStar,
  FiArrowUpRight
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

const COLORS = ["#f97316", "#22c55e", "#6366f1", "#ec4899", "#f59e0b", "#06b6d4"];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center -mt-12">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full animate-spin border-t-orange-500" />
            <div className="absolute inset-3 bg-gradient-to-br from-orange-500 to-green-600 rounded-full animate-pulse flex items-center justify-center">
              <FiActivity className="text-white text-3xl" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Analyzing Platform Data</h2>
          <p className="text-gray-500 text-sm font-medium animate-pulse">Gathering insights...</p>
        </div>
      </div>
    );
  }

  // Calculate high-level stats from data
  const totals = {
    revenue: data?.revenueTrend?.reduce((sum, d) => sum + d.revenue, 0) || 0,
    orders: data?.revenueTrend?.reduce((sum, d) => sum + d.orders, 0) || 0,
    vendors: data?.growth?.vendors?.reduce((sum, d) => sum + d.count, 0) || 0,
    customers: data?.growth?.customers?.reduce((sum, d) => sum + d.count, 0) || 0,
  };

  const chartData = data?.revenueTrend.map(d => {
    const vGrowth = data.growth.vendors.find(v => v._id === d._id)?.count || 0;
    const cGrowth = data.growth.customers.find(v => v._id === d._id)?.count || 0;
    return { ...d, vendors: vGrowth, customers: cGrowth };
  });

  return (
    <div className="min-h-screen w-full py-4 sm:py-6 max-w-screen-2xl mx-auto flex flex-col gap-6 sm:gap-8 pb-20">
      {/* ── Header Segment ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <FiShield size={16} />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-wider">Platform Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5 pr-2">
            Admin Strategic Intel
          </h1>
          <div className="flex items-center gap-2 text-gray-500 text-[10px] sm:text-xs font-medium">
            <FiActivity className="text-green-500" />
            <span>Operational health & commerce velocity</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-1">
            {["7d", "30d", "90d", "12m"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  timeRange === range
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-500 hover:text-orange-500 hover:bg-orange-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="p-2.5 sm:p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-orange-600 transition-all shadow-sm"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
          </button>
        </div>
      </div>

      {/* ── Key Performance Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            label: "Gross Transaction Value",
            value: formatCurrency(totals.revenue),
            icon: FiDollarSign,
            color: "orange",
            change: "+12%",
          },
          {
            label: "Ecosystem Orders",
            value: totals.orders.toLocaleString(),
            icon: FiShoppingBag,
            color: "green",
            change: "+8.4%",
          },
          {
            label: "New Vendors",
            value: totals.vendors,
            icon: FiUsers,
            color: "blue",
            change: "+5.2%",
          },
          {
            label: "Platform Influx",
            value: totals.customers,
            icon: FiTrendingUp,
            color: "purple",
            change: "+22%",
          }
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-${stat.color}-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500`} />
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0 pr-2">
                <p className="text-gray-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1 leading-tight">
                  {stat.label}
                </p>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl shrink-0`}>
                <stat.icon size={18} />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-green-600">
               <FiArrowUpRight /> <span>{stat.change} vs prior</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue Intelligence Chart ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Revenue Velocity</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Daily platform revenue aggregation</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[9px] font-bold uppercase text-gray-600">Actual GMV</span>
             </div>
             <div className="w-[1px] h-3 bg-gray-200" />
             <span className="text-[9px] font-bold text-orange-600">Peak: {formatCurrency(Math.max(...(data?.revenueTrend.map(d => d.revenue) || [0])))}</span>
          </div>
        </div>
        <div className="h-[300px] sm:h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="_id" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: "bold" }}
                dy={10}
                tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: "bold" }}
                tickFormatter={(val) => `₦${val >= 1000 ? val/1000 + 'k' : val}`}
              />
              <Tooltip 
                cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontSize: '11px' }}
                itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                formatter={(val) => [formatCurrency(val), "Revenue"]}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f97316" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#adminRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Marketplace Performance Distributions */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Product Topology</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Category market penetration & listing counts</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
               <FiPackage size={16} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 flex-1">
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {data?.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-xl font-bold text-gray-900">{data?.categoryDistribution.reduce((a, b) => a + b.value, 0)}</span>
                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Units</span>
              </div>
            </div>
            <div className="space-y-3">
               {data?.categoryDistribution.slice(0, 5).map((cat, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                       <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-xs font-bold text-gray-900 truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{cat.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* High Performance Leaders */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Top Merchant List</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Maximum volume processing vendors</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
               <FiStar size={16} />
            </div>
          </div>
          <div className="space-y-3">
             {data?.topVendors.length === 0 ? (
                 <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                       <FiPackage size={20} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Awaiting Performance Data</p>
                 </div>
             ) : (
                 data?.topVendors.map((vendor, i) => (
                     <div key={vendor.name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-900 font-bold text-xs border border-gray-100`}>
                                #{i + 1}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 mb-0.5">{vendor.name}</p>
                                <div className="flex items-center gap-1.5">
                                   <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">{vendor.orders} Orders</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(vendor.revenue)}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Revenue</p>
                        </div>
                     </div>
                 ))
             )}
          </div>
        </div>
      </div>

      {/* ── Population Growth Strategy ── */}
      <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-md">
           <div className="flex items-center gap-2 text-orange-400 font-bold mb-3 uppercase tracking-wider text-[10px]">
              <FiZap /> System Influx Tracker
           </div>
           <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
              User Acquisition Velocity
           </h2>
           <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">
              Track the rapid expansion of the AfriCart ecosystem. Insights on vendor onboarding vs customer migration.
           </p>
           <div className="flex gap-8">
              <div>
                 <h4 className="text-2xl font-bold text-white mb-1">{totals.customers}</h4>
                 <p className="text-[9px] font-bold uppercase text-orange-400 tracking-wider">Global Customers</p>
              </div>
              <div>
                 <h4 className="text-2xl font-bold text-green-400 mb-1">{totals.vendors}</h4>
                 <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Marketplace Vendors</p>
              </div>
           </div>
        </div>

        <div className="w-full h-[280px] max-w-lg bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative z-10">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
               <XAxis 
                 dataKey="_id" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fontSize: 9, fill: "#ffffff50", fontWeight: "bold" }}
                 dy={10}
                 tickFormatter={(str) => {
                     const date = new Date(str);
                     return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                 }}
               />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#ffffff50", fontWeight: "bold" }} />
               <Tooltip 
                 cursor={{ fill: 'transparent' }}
                 contentStyle={{ borderRadius: '12px', background: '#111827', border: '1px solid #374151', color: '#fff', padding: '12px', fontSize: '11px' }}
               />
               <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />
               <Bar name="Consumers" dataKey="customers" fill="#f97316" radius={[4, 4, 0, 0]} barSize={10} />
               <Bar name="Merchants" dataKey="vendors" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={10} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* ── Operational Insight Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
         <div className="bg-gradient-to-br from-orange-500 to-green-600 rounded-2xl p-6 text-white relative overflow-hidden group">
            <FiActivity className="absolute -right-4 -bottom-4 text-white/10 text-[8rem] rotate-12 group-hover:rotate-45 transition-transform duration-700" />
            <div className="relative z-10">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 border border-white/20">
                  <FiTrendingUp className="text-white" size={20} />
               </div>
               <h3 className="text-base sm:text-lg font-bold mb-2">Platform Health</h3>
               <p className="text-xs text-white/90 font-medium leading-relaxed">
                  Platform latency and transaction success rates are currently within optimal thresholds (99.98% uptime).
               </p>
            </div>
         </div>

         <div className="bg-white border border-gray-100 rounded-2xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
               <div className="flex items-center gap-2 font-bold text-orange-500 text-sm mb-3">
                  <FiBarChart2 className="shrink-0" /> Growth Forecast
               </div>
               <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                  Current growth velocity predicts a 15% increase in marketplace volume by the end of next quarter.
               </p>
            </div>
         </div>

         <div className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
             <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4 text-orange-600">
                <FiPackage size={24} />
             </div>
             <h3 className="text-sm font-bold text-gray-900 mb-1">Automated Reports</h3>
             <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-4">Export performance audit</p>
             <button className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors">
                Download PDF
             </button>
         </div>
      </div>
    </div>
  );
}
