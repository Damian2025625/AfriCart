"use client";

import { useState, useEffect } from "react";
import { 
  FiAlertCircle, 
  FiCheckCircle, 
  FiMessageSquare, 
  FiClock, 
  FiXCircle, 
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiTrello,
  FiDollarSign,
  FiUser,
  FiShoppingBag
} from "react-icons/fi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  RESOLVED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  NONE: "bg-gray-100 text-gray-500 border-gray-200",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  NEGOTIATING: "bg-blue-100 text-blue-700"
};

export default function AdminDisputesPage() {
  const [activeTab, setActiveTab] = useState("disputes");
  const [data, setData] = useState({ disputes: [], offers: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/admin/disputes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.success) {
        setData(res);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateDispute = async (status) => {
    if (!selectedDispute) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          orderId: selectedDispute._id,
          status,
          adminNote
        })
      });
      const res = await response.json();
      if (res.success) {
        toast.success(`Dispute ${status} successfully`);
        setSelectedDispute(null);
        setAdminNote("");
        fetchData();
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes & Negotiations</h1>
          <p className="text-sm text-gray-500">Monitor platform issues and price bargains</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab("disputes")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'disputes' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FiAlertCircle className="inline-block mr-2" />
          Reported Issues ({data.disputes.length})
        </button>
        <button 
          onClick={() => setActiveTab("offers")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'offers' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FiDollarSign className="inline-block mr-2" />
          Price Offers ({data.offers.length})
        </button>
      </div>

      {activeTab === "disputes" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            {data.disputes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
                <FiCheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p>No active disputes to review</p>
              </div>
            ) : (
              data.disputes.map((dispute) => (
                <div 
                  key={dispute._id}
                  onClick={() => setSelectedDispute(dispute)}
                  className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${selectedDispute?._id === dispute._id ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-100'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order #{dispute.orderNumber}</p>
                      <h3 className="font-bold text-gray-900">{dispute.dispute.reason}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[dispute.dispute.status]}`}>
                      {dispute.dispute.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <FiUser />
                      </div>
                      <div>
                        <p className="font-bold">{dispute.customerId?.firstName} {dispute.customerId?.lastName}</p>
                        <p className="text-[10px]">Customer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <FiShoppingBag />
                      </div>
                      <div>
                        <p className="font-bold">{dispute.vendorId?.businessName}</p>
                        <p className="text-[10px]">Vendor</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-700 italic border-l-4 border-gray-300">
                    "{dispute.dispute.customerMessage}"
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details & Actions */}
          <div className="lg:col-span-1">
            {selectedDispute ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 sticky top-6 shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Take Action</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 italic text-sm text-purple-900">
                    <FiInfo className="inline-block mr-2 mb-1" />
                    As admin, you can mediate this dispute. Changing the status will notify both parties.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Admin Remarks</label>
                    <textarea 
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add an internal note or explanation..."
                      className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    disabled={updating}
                    onClick={() => handleUpdateDispute('RESOLVED')}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:bg-gray-300"
                  >
                    <FiCheckCircle />
                    Resolve Dispute
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => handleUpdateDispute('REJECTED')}
                    className="w-full py-4 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FiXCircle />
                    Reject/Deny Request
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedDispute(null)}
                  className="w-full mt-4 text-sm text-gray-400 font-semibold hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
                <FiSearch size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a dispute to see details and take action</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Negotiations Tab */
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Parties</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Range / Final</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.offers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">No recent negotiations found</td>
                  </tr>
                ) : (
                  data.offers.map((offer) => (
                    <tr key={offer._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={offer.productId?.images?.[0] || '/api/placeholder/40/40'} 
                            className="w-10 h-10 rounded-lg object-cover"
                            alt=""
                          />
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{offer.productId?.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <p className="flex items-center text-gray-900 font-semibold">
                            <FiUser className="mr-1 text-blue-500" /> {offer.customerId?.userId?.firstName} {offer.customerId?.userId?.lastName}
                          </p>
                          <p className="flex items-center text-gray-500">
                            <FiTrello className="mr-1 text-purple-500" /> {offer.vendorId?.businessName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {offer.finalPrice ? (
                          <p className="text-sm font-bold text-green-600">₦{offer.finalPrice.toLocaleString()}</p>
                        ) : (
                          <p className="text-xs text-gray-500 font-medium italic">₦{offer.minPrice?.toLocaleString()} - ₦{offer.maxPrice?.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[offer.status] || 'bg-gray-100 text-gray-600'}`}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-gray-400 text-[10px]">
                          <FiClock className="mr-1" />
                          {new Date(offer.updatedAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
