"use client";

import React, { useState, useEffect } from "react";
import {
  FiTag,
  FiCheck,
  FiX,
  FiClock,
  FiMessageCircle,
  FiPackage,
  FiUser,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function VendorOffersPage() {
  const router = useRouter();
  const [allOffers, setAllOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseType, setResponseType] = useState(null); // 'accept', 'decline', 'counter'
  const [vendorResponse, setVendorResponse] = useState("");
  const [counterForm, setCounterForm] = useState({
    counterMinPrice: "",
    counterMaxPrice: "",
  });
  const [processing, setProcessing] = useState(false);

  const tabs = [
    { id: "PENDING", label: "Pending", icon: FiClock, color: "yellow" },
    { id: "COUNTERED", label: "Countered", icon: FiRefreshCw, color: "blue" },
    { id: "ACCEPTED", label: "Accepted", icon: FiCheck, color: "green" },
    { id: "DECLINED", label: "Declined", icon: FiX, color: "red" },
  ];

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOffers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/vendor/offers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAllOffers(data.offers || []);
      } else {
        toast.error(data.message || "Failed to load offers");
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = allOffers.filter((offer) => offer.status === activeTab);

  const handleRespond = async (offerId, action) => {
    setProcessing(true);

    try {
      const token = localStorage.getItem("authToken");

      let payload = {
        offerId,
        action,
        vendorResponse: vendorResponse.trim() || null,
      };

      if (action === "COUNTER") {
        const { counterMinPrice, counterMaxPrice } = counterForm;

        if (!counterMinPrice || !counterMaxPrice) {
          toast.error("Please enter both minimum and maximum prices");
          setProcessing(false);
          return;
        }

        const minPrice = parseFloat(counterMinPrice);
        const maxPrice = parseFloat(counterMaxPrice);

        if (isNaN(minPrice) || isNaN(maxPrice)) {
          toast.error("Please enter valid prices");
          setProcessing(false);
          return;
        }

        if (maxPrice <= minPrice) {
          toast.error("Maximum price must be greater than minimum price");
          setProcessing(false);
          return;
        }

        const offer = allOffers.find((o) => o._id === offerId);
        if (!offer) {
          toast.error("Offer not found");
          setProcessing(false);
          return;
        }

        const originalPrice = offer.productId.price;

        if (minPrice < 1 || maxPrice < 1) {
          toast.error("Prices must be at least ₦1");
          setProcessing(false);
          return;
        }

        if (minPrice > originalPrice || maxPrice > originalPrice) {
          toast.error("Counter offer cannot exceed original price");
          setProcessing(false);
          return;
        }

        payload = {
          ...payload,
          counterMinPrice: minPrice,
          counterMaxPrice: maxPrice,
        };
      }

      const response = await fetch("/api/vendor/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (action === "ACCEPT") {
          toast.success("Offer accepted! You can now chat with the customer.");
        } else if (action === "COUNTER") {
          toast.success("Counter-offer sent successfully!");
        } else {
          toast.success("Offer declined");
        }

        setRespondingTo(null);
        setResponseType(null);
        setVendorResponse("");
        setCounterForm({ counterMinPrice: "", counterMaxPrice: "" });
        fetchOffers();

        if (action === "ACCEPT" && data.conversationId) {
          setTimeout(() => {
            router.push(`/dashboard/vendor/chats/${data.conversationId}`);
          }, 2000);
        }
      } else {
        toast.error(data.message || "Failed to process offer");
      }
    } catch (error) {
      console.error("Error responding to offer:", error);
      toast.error("Failed to process offer");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs <= 0) return { text: "Expired", color: "text-red-600" };

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 2) return { text: `${diffDays} days left`, color: "text-green-600" };
    if (diffDays > 0) return { text: `${diffDays}d ${diffHours}h left`, color: "text-yellow-600" };
    return { text: `${diffHours}h left`, color: "text-red-600" };
  };

  const calculateDiscount = (minPrice, maxPrice, originalPrice) => {
    const avgOffer = (minPrice + maxPrice) / 2;
    const discount = ((originalPrice - avgOffer) / originalPrice) * 100;
    return discount.toFixed(0);
  };

  const getLatestCounterOffer = (offer) => {
    if (!offer.counterOffers || offer.counterOffers.length === 0) return null;
    return offer.counterOffers[offer.counterOffers.length - 1];
  };

  // Helper to get the original customer offer
  const getOriginalCustomerOffer = (offer) => {
    if (offer.counterOffers && offer.counterOffers.length > 0) {
      // Find the first customer offer in the counter history
      const firstCustomerOffer = offer.counterOffers.find(c => c.offeredBy === "CUSTOMER");
      if (firstCustomerOffer) {
        return {
          minPrice: firstCustomerOffer.minPrice,
          maxPrice: firstCustomerOffer.maxPrice,
          note: firstCustomerOffer.note
        };
      }
    }
    // If no counter history, use the current offer prices (original offer)
    return {
      minPrice: offer.minPrice,
      maxPrice: offer.maxPrice,
      note: offer.customerNote
    };
  };

  const resetResponseForm = () => {
    setRespondingTo(null);
    setResponseType(null);
    setVendorResponse("");
    setCounterForm({ counterMinPrice: "", counterMaxPrice: "" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Price Offers</h1>
        <p className="text-gray-600 text-sm">
          Manage customer price negotiation requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">
                {allOffers.filter((o) => o.status === "PENDING").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <FiClock className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 mb-1">Countered</p>
              <p className="text-2xl font-bold text-blue-700">
                {allOffers.filter((o) => o.status === "COUNTERED").length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiRefreshCw className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 mb-1">Accepted</p>
              <p className="text-2xl font-bold text-green-700">
                {allOffers.filter((o) => o.status === "ACCEPTED").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <FiCheck className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 mb-1">Declined</p>
              <p className="text-2xl font-bold text-red-700">
                {allOffers.filter((o) => o.status === "DECLINED").length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <FiX className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = allOffers.filter((o) => o.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-orange-500"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-white text-orange-500"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiTag className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No offers yet</h2>
          <p className="text-gray-600 text-sm">
            {activeTab === "PENDING"
              ? "Pending offers will appear here"
              : `No ${activeTab.toLowerCase()} offers`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => {
            const timeRemaining = getTimeRemaining(offer.expiresAt);
            const latestCounter = getLatestCounterOffer(offer);
            const originalOffer = getOriginalCustomerOffer(offer);
            const isResponding = respondingTo === offer._id;

            return (
              <div
                key={offer._id}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {offer.productId?.images?.[0] ? (
                          <img
                            src={offer.productId.images[0]}
                            alt={offer.productId.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPackage className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {offer.productId?.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Original Price:{" "}
                          <span className="font-semibold">
                            {formatCurrency(offer.productId?.price)}
                          </span>
                        </p>

                        {/* Customer Info */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <FiUser className="w-4 h-4" />
                          <span>
                            {offer.customerId?.userId?.firstName}{" "}
                            {offer.customerId?.userId?.lastName}
                          </span>
                        </div>

                        {/* Counter Count Badge */}
                        {offer.counterCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            <FiRefreshCw className="w-3 h-3" />
                            {offer.counterCount} counter{offer.counterCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer's Original Offer */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900">
                          Customer's Original Offer
                        </h4>
                        <span className="text-xs text-purple-700 font-semibold">
                          ~
                          {calculateDiscount(
                            originalOffer.minPrice,
                            originalOffer.maxPrice,
                            offer.productId?.price
                          )}
                          % discount
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <p className="text-xs text-purple-700">Min Price</p>
                          <p className="text-lg font-bold text-purple-900">
                            {formatCurrency(originalOffer.minPrice)}
                          </p>
                        </div>
                        <span className="text-purple-400">→</span>
                        <div>
                          <p className="text-xs text-purple-700">Max Price</p>
                          <p className="text-lg font-bold text-purple-900">
                            {formatCurrency(originalOffer.maxPrice)}
                          </p>
                        </div>
                      </div>
                      {originalOffer.note && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-xs text-purple-700 mb-1">
                            Customer's Note:
                          </p>
                          <p className="text-sm text-purple-900 italic">
                            "{originalOffer.note}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Show Latest Counter if exists and is from customer */}
                    {latestCounter && latestCounter.offeredBy === "CUSTOMER" && offer.status === "PENDING" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="text-xs font-semibold text-blue-700 mb-3">
                          Customer's Latest Counter-Offer
                        </h4>
                        <div className="flex items-center gap-4 mb-2">
                          <div>
                            <p className="text-xs text-blue-700">Min Price</p>
                            <p className="text-lg font-bold text-blue-900">
                              {formatCurrency(latestCounter.minPrice)}
                            </p>
                          </div>
                          <FiArrowRight className="text-blue-400" />
                          <div>
                            <p className="text-xs text-blue-700">Max Price</p>
                            <p className="text-lg font-bold text-blue-900">
                              {formatCurrency(latestCounter.maxPrice)}
                            </p>
                          </div>
                        </div>
                        {latestCounter.note && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-blue-700 mb-1">
                              Customer's Message:
                            </p>
                            <p className="text-sm text-blue-900 italic">
                              "{latestCounter.note}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show Counter History for COUNTERED status */}
                    {offer.status === "COUNTERED" && offer.counterOffers?.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="text-xs font-semibold text-blue-700 mb-3">
                          Negotiation History ({offer.counterOffers.length} rounds)
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto text-gray-900">
                          {offer.counterOffers.map((counter, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-2 rounded text-gray-900 ${
                                counter.offeredBy === "VENDOR"
                                  ? "bg-orange-50 border border-orange-200"
                                  : "bg-purple-50 border border-purple-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">
                                  {counter.offeredBy === "VENDOR" ? "You" : "Customer"}
                                </span>
                                <span className="text-gray-900">
                                  {formatDate(counter.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(counter.minPrice)}</span>
                                <FiArrowRight className="w-3 h-3" />
                                <span>{formatCurrency(counter.maxPrice)}</span>
                              </div>
                              {counter.note && (
                                <p className="mt-1 italic text-gray-700">
                                  "{counter.note}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Submitted: {formatDate(offer.createdAt)}</span>
                      {offer.status === "PENDING" && (
                        <span className={`font-semibold ${timeRemaining.color}`}>
                          {timeRemaining.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:w-72 shrink-0">
                    {offer.status === "PENDING" || offer.status === "COUNTERED" ? (
                      !isResponding ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setRespondingTo(offer._id);
                              setResponseType("accept");
                            }}
                            className="w-full py-2.5 bg-green-500 text-white text-xs rounded-lg font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                          >
                            <FiCheck className="w-4 h-4" />
                            Accept Offer
                          </button>
                          <button
                            onClick={() => {
                              setRespondingTo(offer._id);
                              setResponseType("counter");
                            }}
                            className="w-full py-2.5 bg-blue-500 text-white text-xs rounded-lg font-semibold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                          >
                            <FiRefreshCw className="w-4 h-4" />
                            Make Counter-Offer
                          </button>
                          <button
                            onClick={() => {
                              setRespondingTo(offer._id);
                              setResponseType("decline");
                            }}
                            className="w-full py-2.5 bg-red-500 text-white text-xs rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                          >
                            <FiX className="w-4 h-4" />
                            Decline Offer
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Counter-Offer Form */}
                          {responseType === "counter" && (
                            <>
                              <div>
                                <label className="text-xs text-gray-700 font-medium block mb-1">
                                  Your Minimum Price (₦)
                                </label>
                                <input
                                  type="number"
                                  value={counterForm.counterMinPrice}
                                  onChange={(e) =>
                                    setCounterForm({
                                      ...counterForm,
                                      counterMinPrice: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 outline-none"
                                  placeholder="Enter minimum price"
                                  min="1"
                                  step="1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-700 font-medium block mb-1">
                                  Your Maximum Price (₦)
                                </label>
                                <input
                                  type="number"
                                  value={counterForm.counterMaxPrice}
                                  onChange={(e) =>
                                    setCounterForm({
                                      ...counterForm,
                                      counterMaxPrice: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 outline-none"
                                  placeholder="Enter maximum price"
                                  min="1"
                                  step="1"
                                />
                              </div>
                            </>
                          )}

                          {/* Message Field */}
                          <div>
                            <label className="text-xs text-gray-700 font-medium block mb-1">
                              Message to Customer (Optional)
                            </label>
                            <textarea
                              value={vendorResponse}
                              onChange={(e) => setVendorResponse(e.target.value)}
                              placeholder={
                                responseType === "counter"
                                  ? "Explain your counter-offer..."
                                  : responseType === "decline"
                                  ? "Explain why you're declining..."
                                  : "Add a message..."
                              }
                              rows="3"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 outline-none"
                              maxLength="500"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleRespond(
                                  offer._id,
                                  responseType === "accept"
                                    ? "ACCEPT"
                                    : responseType === "counter"
                                    ? "COUNTER"
                                    : "DECLINE"
                                )
                              }
                              disabled={processing}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1 ${
                                responseType === "accept"
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : responseType === "counter"
                                  ? "bg-blue-500 text-white hover:bg-blue-600"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                            >
                              {processing ? (
                                "Processing..."
                              ) : (
                                <>
                                  {responseType === "accept" && (
                                    <>
                                      <FiCheck className="w-4 h-4" />
                                      Accept
                                    </>
                                  )}
                                  {responseType === "counter" && (
                                    <>
                                      <FiRefreshCw className="w-4 h-4" />
                                      Send Counter
                                    </>
                                  )}
                                  {responseType === "decline" && (
                                    <>
                                      <FiX className="w-4 h-4" />
                                      Decline
                                    </>
                                  )}
                                </>
                              )}
                            </button>
                            <button
                              onClick={resetResponseForm}
                              disabled={processing}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    ) : offer.status === "ACCEPTED" ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800 font-semibold mb-1">
                            ✓ Accepted
                          </p>
                          <p className="text-xs text-green-700">
                            {formatDate(offer.acceptedAt || offer.updatedAt)}
                          </p>
                          {offer.vendorResponse && (
                            <p className="text-xs text-green-700 mt-2 italic">
                              "{offer.vendorResponse}"
                            </p>
                          )}
                        </div>
                        {offer.conversationId && (
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/vendor/chats/${offer.conversationId}`
                              )
                            }
                            className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                          >
                            <FiMessageCircle className="w-4 h-4" />
                            Go to Chat
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-semibold mb-1">
                          ✗ Declined
                        </p>
                        <p className="text-xs text-red-700">
                          {formatDate(offer.declinedAt || offer.updatedAt)}
                        </p>
                        {offer.vendorResponse && (
                          <p className="text-xs text-red-700 mt-2 italic">
                            "{offer.vendorResponse}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}