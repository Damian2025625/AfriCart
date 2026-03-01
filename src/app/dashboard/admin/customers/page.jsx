"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiSearch, FiUsers, FiPackage, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiMail, FiPhone, FiCalendar,
} from "react-icons/fi";
import toast from "react-hot-toast";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCustomers(data.customers);
      else toast.error(data.message);
    } catch { toast.error("Failed to load customers"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const handleAction = async (userId, action) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchCustomers(); }
      else toast.error(data.message);
    } catch { toast.error("Action failed"); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} registered customers</p>
        </div>
        <button onClick={fetchCustomers} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm self-start sm:self-auto">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-6 flex flex-col gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-xl" />)}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
            <FiUsers className="text-5xl" />
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{c.firstName} {c.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-gray-600 flex items-center gap-1"><FiMail className="text-gray-400 shrink-0" />{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><FiPhone className="text-gray-300 shrink-0" />{c.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                        <FiPackage className="text-xs" />{c.orderCount || 0} orders
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {c.isActive ? <><FiCheckCircle /> Active</> : <><FiXCircle /> Suspended</>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.isActive ? (
                        <button
                          onClick={() => handleAction(c._id, "suspend")}
                          disabled={actionLoading === `${c._id}-suspend`}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-60"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(c._id, "activate")}
                          disabled={actionLoading === `${c._id}-activate`}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-60"
                        >
                          Activate
                        </button>
                      )}
                    </td>
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
