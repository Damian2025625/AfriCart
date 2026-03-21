"use client";

import React, { useState, useEffect } from "react";
import {
  FiZap,
  FiUsers,
  FiBox,
  FiAward,
  FiClock,
  FiX,
  FiChevronRight,
  FiCheckCircle,
  FiShare2,
  FiTrendingUp,
  FiPlus,
  FiInfo,
  FiEye,
  FiTrash2,
} from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PromotionsPage() {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [config, setConfig] = useState({
    productId: "",
    targetCount: 10,
    discountAmount: "",
    durationHours: 24,
    minPrice: "",
    maxPrice: "",
  });

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const [phSessions, setPhSessions] = useState([]);
  const [loadingPh, setLoadingPh] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchPowerHours();
  }, []);

  const fetchPowerHours = async () => {
    setLoadingPh(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/vendor/promotions/power-hour", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPhSessions(data.sessions || []);
    } catch {
      console.error("Failed to load power hours");
    } finally {
      setLoadingPh(false);
    }
  };

  useEffect(() => {
    if (showSetup) fetchProducts();
  }, [showSetup]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/vendor/products/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/vendor/promotions/slash", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("[PromotionsPage] fetchSessions data:", data);
      if (data.success) {
        setSessions(data.sessions || []);
        if (data.debug) setDebugInfo(data.debug);
      } else {
        console.error("[PromotionsPage] fetchSessions failed:", data.message);
      }
    } catch (err) {
      console.error("[PromotionsPage] fetchSessions error:", err);
      console.error("Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const promotions = [
    {
      id: "community-slashing",
      name: "Community Slashing",
      description: "Let customers band together for a group price slash. They spread the word—you move volume.",
      icon: FiUsers,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      status: "LIVE",
      badge: "Most Popular",
      benefit: "Viral Growth",
    },
    {
      id: "negotiation-power-hour",
      name: "Power Hour",
      description: "Timed window where customer price offers are auto-accepted within your range.",
      icon: FiZap,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      status: "LIVE",
      badge: "High Velocity",
      benefit: "Fast Sales",
    },
    {
      id: "unboxing-bounty",
      name: "Unboxing Bounty",
      description: "Reward buyers with store credit for video reviews. Turn customers into brand advocates.",
      icon: FiBox,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      status: "COMING SOON",
      badge: "Social Proof",
      benefit: "Trust Lift",
    },
    {
      id: "milestone-unlocks",
      name: "Shop Milestones",
      description: "Set spend targets so customers unlock permanent perks like free shipping.",
      icon: FiAward,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      status: "COMING SOON",
      badge: "Retention",
      benefit: "Loyalty",
    },
  ];

  const handleLaunch = (promo) => {
    if (promo.status === "COMING SOON") {
      toast.error("This tool is currently in the AfriCart lab!");
      return;
    }
    setSelectedPromo(promo);
    setConfig({ 
      productId: "", 
      targetCount: 10, 
      discountAmount: "", 
      durationHours: 24,
      minPrice: "",
      maxPrice: ""
    });
    setShowSetup(true);
  };
  
  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) return;
    
    const loadingToast = toast.loading("Deleting promotion...");
    try {
      const token = localStorage.getItem("authToken");
      const endpoint = type === 'SLASH' 
        ? `/api/vendor/promotions/slash?id=${id}` 
        : `/api/vendor/promotions/power-hour?id=${id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Promotion deleted!", { id: loadingToast });
        fetchSessions();
        fetchPowerHours();
      } else {
        toast.error(data.message || "Delete failed", { id: loadingToast });
      }
    } catch (err) {
      toast.error("An error occurred", { id: loadingToast });
    }
  };

  const handleSubmitSetup = async (e) => {
    e.preventDefault();
    if (!config.productId) return toast.error("Please select a product");
    
    if (selectedPromo.id === 'community-slashing') {
      if (!config.discountAmount) return toast.error("Please set a discount amount");
    } else if (selectedPromo.id === 'negotiation-power-hour') {
      if (!config.minPrice || !config.maxPrice) return toast.error("Please set both min and max prices");
    }

    const loadingToast = toast.loading("Launching campaign...", { id: "setup" });
    try {
      const token = localStorage.getItem("authToken");
      const endpoint = selectedPromo.id === 'community-slashing' 
        ? "/api/vendor/promotions/slash" 
        : "/api/vendor/promotions/power-hour";

      const payload = selectedPromo.id === 'community-slashing' ? {
        productId: config.productId,
        targetCount: config.targetCount,
        discountAmount: config.discountAmount,
        durationHours: config.durationHours,
      } : {
        productId: config.productId,
        minAcceptablePrice: config.minPrice,
        maxAcceptablePrice: config.maxPrice,
        durationHours: config.durationHours,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${selectedPromo.name} is now live!`, { id: "setup" });
        setShowSetup(false);
        fetchSessions();
        fetchPowerHours();
      } else {
        toast.error(data.message || "Failed to launch campaign", { id: "setup" });
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.", { id: "setup" });
    }
  };

  // Process and merge both campaign types
  const allCampaigns = [
    ...sessions.map(s => ({ ...s, type: 'SLASH' })),
    ...phSessions.map(s => ({ ...s, type: 'POWER' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 1. Total Active Campaigns (Include both types)
  const activeCampaigns = allCampaigns.filter(s => s.status === 'PENDING' || s.status === 'ACTIVE').length;

  // 2. Total Reach (Sum of Slash participants + accepted Power Hour offers)
  const totalReach = allCampaigns.reduce((sum, s) => 
    sum + (s.type === 'SLASH' ? (s.currentCount || 0) : (s.acceptedCount || 0)), 0
  );

  // 3. New Joins (24h)
  const newJoins = allCampaigns.filter(s => {
    const createdDate = new Date(s.createdAt);
    const now = new Date();
    return (now - createdDate) < (24 * 60 * 60 * 1000);
  }).reduce((sum, s) => 
    sum + (s.type === 'SLASH' ? (s.currentCount || 0) : (s.acceptedCount || 0)), 0
  );

  // 4. Campaign impressions (Sum of views FOR the specific campaign sessions)
  const totalPromoViews = allCampaigns.reduce((sum, s) => sum + (s.views || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Header - Consistent with Orders/Products */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketing Hub</h1>
        <p className="text-gray-600 text-sm">
          Launch viral campaigns and boost your shop's growth with exclusive AfriCart tools.
        </p>
        {debugInfo && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-[10px] text-gray-400 font-mono">
            Debug: VendorID={debugInfo.vendorId} Sessions={debugInfo.sessionCount}
          </div>
        )}
      </div>

      {/* Stats - Consistent with Dashboard Stats */}
      <div id="promotions-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">{activeCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Reach</p>
          <p className="text-2xl font-bold text-gray-900">{totalReach}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-6 shadow-sm border border-orange-100">
          <p className="text-xs text-orange-700 mb-1">New Joins (24h)</p>
          <p className="text-2xl font-bold text-orange-700">{newJoins}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-100">
          <p className="text-xs text-green-700 mb-1">Campaign Impressions</p>
          <p className="text-2xl font-bold text-green-700">{totalPromoViews}</p>
        </div>
      </div>

      {/* Promotions Grid */}
      <div id="promotions-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {promotions.map((promo) => (
          <div 
            key={promo.id}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 ${promo.iconBg} rounded-xl flex items-center justify-center`}>
                <promo.icon className={`text-2xl ${promo.iconColor}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${promo.status === 'LIVE' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                {promo.badge}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{promo.name}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
              {promo.description}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1.5">
                <FiTrendingUp className="text-green-500" size={14} />
                <span className="text-xs font-medium text-gray-700">{promo.benefit}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <FiClock size={14} />
                <span className="text-xs">Setup in 60s</span>
              </div>
            </div>

            <button 
              onClick={() => handleLaunch(promo)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                promo.status === 'LIVE' 
                ? 'bg-linear-to-r from-orange-500 to-green-600 text-white hover:shadow-lg' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {promo.status === 'LIVE' ? 'Launch Custom Campaign' : 'Coming Soon'}
              {promo.status === 'LIVE' && <FiChevronRight />}
            </button>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="relative z-10">
          <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
            <FiInfo className="text-orange-500" /> Pay-As-You-Grow Model
          </h4>
          <p className="text-sm text-gray-400 max-w-xl">
            AfriCart doesn't charge for setting up these tools. We only take a tiny success commission (2-3%) 
            when a sale is actually made via a promotion. Your success is our success.
          </p>
        </div>
        <button className="relative z-10 px-6 py-2.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">
          Learn More
        </button>
        <FiZap className="absolute -right-8 -bottom-8 text-9xl text-white/5 rotate-12" />
      </div>

      {/* Campaign Monitoring Section */}
      <div id="promotions-monitoring" className="mt-12 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Campaign Monitoring</h3>
            <p className="text-xs text-gray-500 mt-1">Real-time performance of your active and past promotions</p>
          </div>
          <button 
            onClick={fetchSessions}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-orange-600 font-bold text-xs"
          >
            Refresh Data
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participation</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visibility</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(loadingSessions || loadingPh) ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-400 italic">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      Loading monitoring data...
                    </div>
                  </td>
                </tr>
              ) : (sessions.length === 0 && phSessions.length === 0) ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                        <FiTrendingUp className="text-gray-300 text-2xl" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold">No campaigns yet</p>
                        <p className="text-gray-500 text-xs mt-1">Launch your first promotion to see performance data here.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {allCampaigns.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 relative overflow-hidden">
                            {s.productId?.images?.[0] ? (
                              <Image src={s.productId.images[0]} alt="" fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <FiBox />
                              </div>
                            )}
                          </div>
                          <div className="max-w-[150px]">
                            <p className="text-xs font-bold text-gray-900 truncate">{s.productId?.name || 'Deleted Product'}</p>
                            <p className="text-[10px] text-gray-400">₦{s.productId?.price?.toLocaleString() || '0'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${s.type === 'SLASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {s.type === 'SLASH' ? 'Group Buy' : 'Power Hour'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {s.type === 'SLASH' ? (
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] mb-1 font-medium">
                              <span className="text-gray-600">{s.currentCount}/{s.targetCount} joined</span>
                              <span className="text-orange-600">{Math.round(((s.currentCount || 0)/(s.targetCount || 1))*100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((s.currentCount || 0)/(s.targetCount || 1))*100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px]">
                            <p className="font-bold text-blue-600 mb-1">{s.acceptedCount || 0} people</p>
                            <p className="text-gray-400">got accepted offers</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <FiEye className="text-gray-400" />
                          <span className="text-xs font-bold" title="Total times this promotion was seen by customers">{s.views || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          s.status === 'SUCCESS' || s.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-600'
                            : s.status === 'PENDING'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => router.push(`/dashboard/customer/products/${s.productId?._id}`)}
                            className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            View Link
                          </button>
                          <button 
                            onClick={() => handleDelete(s._id, s.type)}
                            className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                            title="Delete Promotion"
                          >
                            <FiTrash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SETUP MODAL - Matching "Add Product" Modal Style */}
      {showSetup && selectedPromo && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Setup {selectedPromo.name}</h3>
                <p className="text-xs text-gray-600 mt-1">Configure your custom campaign parameters</p>
              </div>
              <button 
                onClick={() => setShowSetup(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <FiX size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitSetup} className="p-6 space-y-6">
              {/* Product Card Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Campaign Product <span className="text-red-500">*</span>
                </label>
                <select 
                  value={config.productId}
                  onChange={(e) => setConfig({...config, productId: e.target.value})}
                  className="w-full text-sm text-gray-900 h-11 px-4 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                  disabled={loadingProducts}
                  required
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} — ₦{p.price.toLocaleString()}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-2 italic">
                  Tip: Pick your best-selling items for maximum viral effect.
                </p>
              </div>

              {/* Parameters Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {/* Conditional Fields */}
                {selectedPromo.id === "community-slashing" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Committed Target
                      </label>
                      <div className="relative">
                        <FiUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="number" 
                          value={config.targetCount}
                          onChange={(e) => setConfig({...config, targetCount: e.target.value})}
                          className="w-full text-sm text-gray-900 h-11 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 outline-none"
                          placeholder="10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Slash Amount (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                        <input 
                          type="number" 
                          value={config.discountAmount}
                          onChange={(e) => setConfig({...config, discountAmount: e.target.value})}
                          className="w-full text-sm text-gray-900 h-11 pl-8 pr-4 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 outline-none"
                          placeholder="2000"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Min Acceptable Price (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                        <input
                          type="number"
                          value={config.minPrice}
                          onChange={(e) => setConfig({ ...config, minPrice: e.target.value })}
                          className="w-full text-sm text-gray-900 h-11 pl-8 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-0.5 focus:ring-orange-500"
                          placeholder="e.g. 4500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Max Auto-Accept (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                        <input
                          type="number"
                          value={config.maxPrice}
                          onChange={(e) => setConfig({ ...config, maxPrice: e.target.value })}
                          className="w-full text-sm text-gray-900 h-11 pl-8 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-0.5 focus:ring-orange-500"
                          placeholder="e.g. 6000"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Active Window (Hours)
                  </label>
                  <div className="flex gap-2">
                    {[12, 24, 48, 72].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setConfig({...config, durationHours: h})}
                        className={`flex-1 h-11 rounded-lg text-xs font-bold transition-all border ${
                          config.durationHours === h 
                          ? 'bg-orange-500 text-white border-orange-500' 
                          : 'bg-white text-gray-500 border-gray-200 hover:border-orange-500'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              {config.productId && config.discountAmount && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 font-bold text-[11px] mb-1">
                    <FiCheckCircle size={14} /> Campaign Summary
                  </div>
                  <p className="text-[11px] text-green-800 leading-relaxed">
                    When {config.targetCount} buyers commit, the product price will drop by ₦{Number(config.discountAmount).toLocaleString()} for a {config.durationHours}h window.
                  </p>
                </div>
              )}

              <button 
                type="submit"
                className="w-full h-10 bg-linear-to-r from-orange-500 to-green-600 text-xs text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Confirm & Launch Campaign
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}