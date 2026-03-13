"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiShield,
  FiUser,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import { RiStoreLine } from "react-icons/ri";
import toast from "react-hot-toast";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterVerified !== "") params.set("verified", filterVerified);

      const res = await fetch(`/api/admin/vendors?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVendors(data.vendors);
      else toast.error(data.message);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search, filterVerified]);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const handleAction = async (vendorId, action) => {
    setActionLoading(`${vendorId}-${action}`);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchVendors();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const verifiedCount = vendors.filter((v) => v.isVerified).length;
  const unverifiedCount = vendors.filter((v) => !v.isVerified).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Vendor Management</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {vendors.length} vendors · {verifiedCount} verified · {unverifiedCount} pending
          </p>
        </div>
        <button
          onClick={fetchVendors}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm active:scale-95 self-start md:self-auto"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          <span>SYNC LIST</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business name, city, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-400 text-sm" />
          <select
            value={filterVerified}
            onChange={(e) => setFilterVerified(e.target.value)}
            className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white cursor-pointer"
          >
            <option value="">All Vendors</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>

      {/* Vendor Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-gray-200 rounded-2xl" />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 text-gray-400">
          <RiStoreLine className="text-5xl" />
          <p className="text-sm font-medium">No vendors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((vendor) => {
            const isActive = vendor.userId?.isActive !== false;
            return (
              <div key={vendor._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Top Row */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0">
                    {vendor.logoUrl ? (
                      <img src={vendor.logoUrl} alt={vendor.businessName} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      vendor.businessName?.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{vendor.businessName}</h3>
                      {vendor.isVerified ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold shrink-0">
                          <FiShield className="text-[10px]" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold shrink-0">
                          <FiAlertCircle className="text-[10px]" /> Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <FiMapPin className="text-[10px]" /> {vendor.city}, {vendor.state}
                    </p>
                  </div>
                  {!isActive && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold shrink-0">Suspended</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <FiUser className="shrink-0 text-gray-400" />
                    <span>{vendor.userId?.firstName} {vendor.userId?.lastName}</span>
                    <span className="text-gray-300">·</span>
                    <span className="truncate">{vendor.userId?.email}</span>
                  </div>
                  {vendor.businessPhone && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="shrink-0 text-gray-400" />
                      <span>{vendor.businessPhone}</span>
                    </div>
                  )}
                  <div className="text-gray-400">Joined {formatDate(vendor.createdAt)}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  {!vendor.isVerified ? (
                    <button
                      onClick={() => handleAction(vendor._id, "verify")}
                      disabled={actionLoading === `${vendor._id}-verify`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      <FiCheckCircle />
                      {actionLoading === `${vendor._id}-verify` ? "Verifying..." : "Verify"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(vendor._id, "unverify")}
                      disabled={actionLoading === `${vendor._id}-unverify`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
                    >
                      <FiXCircle />
                      Unverify
                    </button>
                  )}

                  {isActive ? (
                    <button
                      onClick={() => handleAction(vendor._id, "suspend")}
                      disabled={actionLoading === `${vendor._id}-suspend`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      <FiXCircle />
                      {actionLoading === `${vendor._id}-suspend` ? "Suspending..." : "Suspend"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(vendor._id, "activate")}
                      disabled={actionLoading === `${vendor._id}-activate`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
                    >
                      <FiCheckCircle />
                      {actionLoading === `${vendor._id}-activate` ? "Activating..." : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
