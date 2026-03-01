"use client";

import { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiArrowUpRight,
  FiArrowDownRight,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiLayers,
  FiCreditCard,
  FiActivity,
  FiTrendingUp,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        toast.error(result.message || "Failed to load payments");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="h-80 bg-gray-200 rounded-2xl" />
            <div className="h-80 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finances & Splits</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoring automatic Paystack subaccount settlements</p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Sync Transactions
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Main Wallet: Mostly Commissions */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                   <FiDollarSign className="text-2xl opacity-80" />
                   <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Platform Wallet</span>
               </div>
               <p className="text-xs opacity-70 mb-1">Live Paystack Balance</p>
               <h3 className="text-2xl font-bold">{formatCurrency(data?.stats.walletBalance)}</h3>
           </div>
           <FiActivity className="absolute -right-4 -bottom-4 opacity-5" size={120} />
        </div>

        {/* Total Platform Earnings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
               <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                   <FiTrendingUp className="text-purple-600" />
               </div>
               <FiArrowUpRight className="text-purple-500" />
           </div>
           <p className="text-xs text-gray-500 mb-1">Total Commission (3%)</p>
           <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data?.stats.totalPlatformCommission)}</h3>
           <p className="text-[10px] text-gray-400 mt-1 italic">Lifetime platform profit</p>
        </div>

        {/* Pending Settlements (T+1 Window) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
               <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                   <FiClock className="text-orange-600" />
               </div>
               <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">T+1</span>
           </div>
           <p className="text-xs text-gray-500 mb-1">Awaiting Settlement</p>
           <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data?.stats.pendingSettlement)}</h3>
           <p className="text-[10px] text-gray-400 mt-1 italic">Vendor shares in 24h window</p>
        </div>

        {/* Total Vendor Payouts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
               <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                   <FiCheckCircle className="text-green-600" />
               </div>
           </div>
           <p className="text-xs text-gray-500 mb-1">Total Vendor Share</p>
           <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data?.stats.totalVendorShare)}</h3>
           <p className="text-[10px] text-gray-400 mt-1 italic">Across {data?.stats.totalOrdersCount} payouts</p>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inbound Transaction Logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FiCreditCard className="text-gray-400" /> 
                    Incoming Customer Payments
                </h2>
                <span className="text-[10px] text-gray-400 font-medium">Last 10 Payments</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3">Reference/Order</th>
                            <th className="px-5 py-3 text-right">Gross Amount</th>
                            <th className="px-5 py-3 text-right">Plat. Share</th>
                            <th className="px-5 py-3 text-center">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data?.recentInbound.map((tx) => (
                            <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">#{tx.orderNumber}</span>
                                        <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{tx.paymentReference}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 font-bold text-gray-900 text-right">{formatCurrency(tx.total)}</td>
                                <td className="px-5 py-3 text-purple-600 font-bold text-right">+{formatCurrency(tx.total * 0.03)}</td>
                                <td className="px-5 py-3 text-center">
                                    <span className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.recentInbound.length === 0 && (
                    <div className="py-12 text-center text-gray-400">No verified payments found</div>
                )}
            </div>
        </div>

        {/* Automatic Payout Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FiLayers className="text-gray-400" />
                    Automatic Split Pipeline
                </h2>
                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Recent Splits</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3">Vendor Account</th>
                            <th className="px-5 py-3 text-right">Split Amount</th>
                            <th className="px-5 py-3 text-center">Settlement</th>
                            <th className="px-5 py-3">Subaccount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data?.payouts.map((payout) => (
                            <tr key={payout._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 truncate max-w-[120px]">{payout.vendorId?.businessName || 'Merchant'}</span>
                                        <span className="text-[9px] text-gray-400">#{payout.orderNumber}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 font-bold text-green-600 text-right">{formatCurrency(payout.vendorSettlement?.amount)}</td>
                                <td className="px-5 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase ${new Date(payout.createdAt) > new Date(Date.now() - 24*60*60*1000) ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                        {new Date(payout.createdAt) > new Date(Date.now() - 24*60*60*1000) ? 'Processing' : 'Settled'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 font-mono text-[9px] text-gray-400">
                                    {payout.vendorSettlement?.subaccountCode}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.payouts.length === 0 && (
                    <div className="py-12 text-center text-gray-400">No subaccount splits recorded yet</div>
                )}
            </div>
        </div>
      </div>

      {/* Process Banner */}
      <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                  <FiAlertCircle className="text-xl text-blue-500" />
              </div>
              <div className="max-w-2xl">
                  <h4 className="font-bold text-gray-900">How Automatic Splits Work</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Every transaction is automatically split at the source. The platform commission (3%) lands in your main wallet, 
                      while the vendor share (97%) is routed to their respective Paystack subaccounts. 
                      Paystack processes these settlements on a <strong>T+1 schedule</strong> (next business day).
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <div className="text-right hidden sm:block">
                 <p className="text-[10px] text-gray-400 font-medium">Service Status</p>
                 <p className="text-xs font-bold text-green-600">All Systems Operational</p>
             </div>
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
      </div>
    </div>
  );
}
