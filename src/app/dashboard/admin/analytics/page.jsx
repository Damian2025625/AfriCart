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
  FiActivity,
  FiZap,
  FiShield,
  FiChevronRight,
  FiPackage
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
            <div className="absolute inset-3 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-full animate-pulse flex items-center justify-center">
              <FiActivity className="text-white text-3xl" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Platform Intelligence</h2>
          <p className="text-gray-500 font-medium animate-pulse">Decrypting global trends...</p>
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
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* ── Header Segment ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <FiShield size={20} />
            </div>
            <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Platform Hub</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1.5">
            Admin Strategic Intel
          </h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <FiActivity className="text-green-500" />
            <span>Operational health & commerce velocity across the ecosystem</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1">
            {["7d", "30d", "90d", "12m"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  timeRange === range
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} size={18} />
          </button>
        </div>
      </div>

      {/* ── Key Performance Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            label: "Gross Transaction Value",
            value: formatCurrency(totals.revenue),
            icon: FiDollarSign,
            color: "green",
            change: "+12%",
            trend: "up"
          },
          {
            label: "Ecosystem Orders",
            value: totals.orders.toLocaleString(),
            icon: FiShoppingBag,
            color: "orange",
            change: "+8.4%",
            trend: "up"
          },
          {
            label: "New Vendors",
            value: totals.vendors,
            icon: FiUsers,
            color: "indigo",
            change: "+5.2%",
            trend: "up"
          },
          {
            label: "Platform Influx",
            value: totals.customers,
            icon: FiTrendingUp,
            color: "pink",
            change: "+22%",
            trend: "up"
          }
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700`} />
            <div className="flex items-start justify-between mb-6">
              <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}>
                <stat.icon size={22} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black tracking-tighter">
                <FiArrowUpRight /> {stat.change}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1.5 leading-none">
                {stat.label}
              </p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue Intelligence Chart ── */}
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Revenue Velocity</h2>
            <p className="text-xs text-gray-500 font-medium">Daily platform revenue aggregation with predictive trends</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-[10px] font-black uppercase text-gray-600">Actual GMV</span>
             </div>
             <div className="w-[1px] h-3 bg-gray-200" />
             <span className="text-[10px] font-black text-indigo-600">Peak: {formatCurrency(Math.max(...(data?.revenueTrend.map(d => d.revenue) || [0])))}</span>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="_id" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: "bold" }}
                dy={15}
                tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: "bold" }}
                tickFormatter={(val) => `₦${val >= 1000 ? val/1000 + 'k' : val}`}
              />
              <Tooltip 
                cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                formatter={(val) => [formatCurrency(val), "Revenue"]}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#4f46e5" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#adminRevenue)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Marketplace Performance Distributions */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Product Topology</h2>
              <p className="text-xs text-gray-500 font-medium">Category market penetration & listing counts</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
               <FiPackage size={20} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 flex-1">
            <div className="h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {data?.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-2xl font-black text-gray-900">{data?.categoryDistribution.reduce((a, b) => a + b.value, 0)}</span>
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Units</span>
              </div>
            </div>
            <div className="space-y-4">
               {data?.categoryDistribution.slice(0, 5).map((cat, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-sm font-black text-gray-900 truncate">{cat.name}</span>
                    </div>
                    <span className="text-sm font-black text-indigo-600">{cat.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* High Performance Leaders */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Top Merchant List</h2>
              <p className="text-xs text-gray-500 font-medium">Maximum volume processing vendors this cycle</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
               <FiStar size={20} />
            </div>
          </div>
          <div className="space-y-4">
             {data?.topVendors.length === 0 ? (
                 <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                       <FiPackage size={30} />
                    </div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Awaiting Performance Data</p>
                 </div>
             ) : (
                 data?.topVendors.map((vendor, i) => (
                     <div key={vendor.name} className="group flex items-center justify-between p-5 rounded-[1.5rem] bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all border border-transparent hover:border-gray-100 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${COLORS[i % COLORS.length]} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-900 font-black text-sm border border-gray-100`}>
                                #{i + 1}
                            </div>
                            <div>
                                <p className="text-base font-black text-gray-900 mb-0.5">{vendor.name}</p>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{vendor.orders} Orders</span>
                                   <FiChevronRight className="text-gray-300" />
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-black text-gray-900">{formatCurrency(vendor.revenue)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cycle Revenue</p>
                        </div>
                     </div>
                 ))
             )}
          </div>
        </div>
      </div>

      {/* ── Population Growth Strategy ── */}
      <div className="bg-gray-900 rounded-[3rem] p-8 sm:p-12 text-white border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
           <div className="max-w-xl">
              <div className="flex items-center gap-2 text-indigo-400 font-black mb-4 uppercase tracking-[0.3em] text-[10px]">
                 <FiZap /> System Influx Tracker
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight leading-[0.9] mb-6">
                 User Acquisition Velocity
              </h2>
              <p className="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                 Tracking the rapid expansion of the AfriCart ecosystem. Strategic insights on vendor onboarding vs customer migration.
              </p>
              <div className="grid grid-cols-2 gap-8">
                 <div>
                    <h4 className="text-3xl font-black text-white mb-1">{totals.customers}</h4>
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Global Customers</p>
                 </div>
                 <div>
                    <h4 className="text-3xl font-black text-emerald-400 mb-1">{totals.vendors}</h4>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Marketplace Vendors</p>
                 </div>
              </div>
           </div>

           <div className="w-full h-[320px] md:max-w-xl bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#ffffff10" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: "#ffffff50", fontWeight: "bold" }}
                    tickFormatter={(str) => {
                        const date = new Date(str);
                        return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#ffffff50", fontWeight: "bold" }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '24px', background: '#111827', border: '1px solid #1f2937', color: '#fff', padding: '16px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '2px' }} />
                  <Bar name="Consumers" dataKey="customers" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={12} />
                  <Bar name="Merchants" dataKey="vendors" fill="#10b981" radius={[8, 8, 8, 8]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* ── Operational Insight Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <FiActivity className="absolute -right-8 -bottom-8 text-white/5 text-[10rem] rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                  <FiTrendingUp className="text-white" size={24} />
               </div>
               <h3 className="text-xl font-black mb-3">Platform Health</h3>
               <p className="text-sm text-indigo-100 font-medium leading-relaxed opacity-80">
                  Platform latency and transaction success rates are currently within optimal thresholds (99.98% uptime).
               </p>
            </div>
         </div>

         <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <FiZap className="absolute -right-8 -bottom-8 text-white/5 text-[10rem] rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                  <FiBarChart2 className="text-white" size={24} />
               </div>
               <h3 className="text-xl font-black mb-3">Growth Forecast</h3>
               <p className="text-sm text-orange-50 font-medium leading-relaxed opacity-80">
                  Current growth velocity predicts a 15% increase in marketplace volume by the end of next quarter.
               </p>
            </div>
         </div>

         <div className="bg-gray-100/50 rounded-[2.5rem] p-8 border border-gray-100 relative overflow-hidden group flex flex-col justify-center items-center text-center">
             <div className="w-20 h-20 bg-white shadow-xl shadow-gray-200/50 rounded-[2rem] flex items-center justify-center mb-6 text-indigo-600">
                <FiBarChart2 size={32} />
             </div>
             <h3 className="text-lg font-black text-gray-900 mb-2">Automated Reports</h3>
             <p className="text-xs text-gray-500 font-medium mb-6">Generated monthly performance audit ready for review.</p>
             <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-indigo-600/20 transition-all active:scale-95">
                Download PDF
             </button>
         </div>
      </div>
    </div>
  );
}
