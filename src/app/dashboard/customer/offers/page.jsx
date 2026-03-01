"use client";

import React, { useState, useEffect } from "react";
import {
  FiTag,
  FiCheck,
  FiX,
  FiClock,
  FiMessageCircle,
  FiPackage,
  FiAlertCircle,
  FiArrowRight,
  FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CustomerOffersPage() {
  const router = useRouter();
  const [allOffers, setAllOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [respondingToOffer, setRespondingToOffer] = useState(null);
  const [counterForm, setCounterForm] = useState({
    counterMinPrice: "",
    counterMaxPrice: "",
    customerNote: "",
  });

  const tabs = [
    { id: "PENDING", label: "Pending", icon: FiClock, color: "yellow" },
    { id: "COUNTERED", label: "Countered", icon: FiRefreshCw, color: "blue" },
    { id: "ACCEPTED", label: "Accepted", icon: FiCheck, color: "green" },
    { id: "DECLINED", label: "Declined", icon: FiX, color: "red" },
    { id: "EXPIRED", label: "Expired", icon: FiAlertCircle, color: "gray" },
  ];

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOffers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/customer/offers`, {
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

  const calculatePotentialSavings = (minPrice, originalPrice) => {
    return originalPrice - minPrice;
  };

  const handleRespondToCounter = async (offerId, action) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      let payload = { offerId, action };

      if (action === "COUNTER_BACK") {
        const { counterMinPrice, counterMaxPrice, customerNote } = counterForm;

        if (!counterMinPrice || !counterMaxPrice) {
          toast.error("Please enter both minimum and maximum prices");
          return;
        }

        const minPrice = parseFloat(counterMinPrice);
        const maxPrice = parseFloat(counterMaxPrice);

        if (isNaN(minPrice) || isNaN(maxPrice)) {
          toast.error("Please enter valid prices");
          return;
        }

        if (maxPrice <= minPrice) {
          toast.error("Maximum price must be greater than minimum price");
          return;
        }

        const offer = allOffers.find((o) => o._id === offerId);
        if (!offer) {
          toast.error("Offer not found");
          return;
        }

        const originalPrice = offer.productId.price;

        if (minPrice < 1 || maxPrice < 1) {
          toast.error("Prices must be at least ₦1");
          return;
        }

        if (minPrice > originalPrice || maxPrice > originalPrice) {
          toast.error("Counter offer cannot exceed original price");
          return;
        }

        payload = {
          ...payload,
          counterMinPrice: minPrice,
          counterMaxPrice: maxPrice,
          customerNote: customerNote.trim() || null,
        };
      }

      const response = await fetch(`/api/customer/offers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setRespondingToOffer(null);
        setCounterForm({
          counterMinPrice: "",
          counterMaxPrice: "",
          customerNote: "",
        });
        fetchOffers();

        if (action === "ACCEPT_COUNTER" && data.conversationId) {
          router.push(`/dashboard/customer/chat/${data.conversationId}`);
        }
      } else {
        toast.error(data.message || "Failed to respond to counter-offer");
      }
    } catch (error) {
      console.error("Error responding to counter-offer:", error);
      toast.error("Failed to respond to counter-offer");
    }
  };

  const getLatestCounterOffer = (offer) => {
    if (!offer.counterOffers || offer.counterOffers.length === 0) return null;
    return offer.counterOffers[offer.counterOffers.length - 1];
  };

  // Helper to get the original customer offer (first counter if exists, otherwise current prices)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FiTag className="text-orange-500" />
            My Price Offers
          </h1>
          <p className="text-gray-600">
            Track your price negotiation requests with vendors
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-600 mb-1">Total Offers</p>
            <p className="text-2xl font-bold text-gray-900">
              {allOffers.length}
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <p className="text-xs text-yellow-700 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">
              {allOffers.filter((o) => o.status === "PENDING").length}
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-700 mb-1">Countered</p>
            <p className="text-2xl font-bold text-blue-700">
              {allOffers.filter((o) => o.status === "COUNTERED").length}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-700 mb-1">Accepted</p>
            <p className="text-2xl font-bold text-green-700">
              {allOffers.filter((o) => o.status === "ACCEPTED").length}
            </p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-xs text-red-700 mb-1">Declined</p>
            <p className="text-2xl font-bold text-red-700">
              {allOffers.filter((o) => o.status === "DECLINED").length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No offers yet
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {activeTab === "PENDING"
                ? "Start negotiating prices with vendors!"
                : `No ${activeTab.toLowerCase()} offers`}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer) => {
              const timeRemaining = getTimeRemaining(offer.expiresAt);
              const latestCounter = getLatestCounterOffer(offer);
              const originalOffer = getOriginalCustomerOffer(offer);
              const isResponding = respondingToOffer === offer._id;

              return (
                <div
                  key={offer._id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Product Info */}
                      <div className="flex gap-4 flex-1">
                        <Link
                          href={`/customer/products/${offer.productId?._id}`}
                          className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
                        >
                          {offer.productId?.images?.[0] ? (
                            <img
                              src={offer.productId.images[0]}
                              alt={offer.productId.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage className="text-gray-400 text-2xl" />
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/customer/products/${offer.productId?._id}`}
                            className="font-bold text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 mb-1"
                          >
                            {offer.productId?.name}
                          </Link>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600">
                              Original Price:
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatCurrency(offer.productId?.price)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Vendor:</span>
                            <span>{offer.vendorId?.businessName}</span>
                          </div>

                          {/* Counter Count Badge */}
                          {offer.counterCount > 0 && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                <FiRefreshCw className="w-3 h-3" />
                                {offer.counterCount} counter{offer.counterCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Offer Details */}
                      <div className="md:w-80 shrink-0">
                        {/* Show original customer offer */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                          <h4 className="text-xs font-semibold text-purple-700 mb-2">
                            YOUR ORIGINAL OFFER
                          </h4>
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="text-xs text-purple-600">Min</p>
                              <p className="text-lg font-bold text-purple-900">
                                {formatCurrency(originalOffer.minPrice)}
                              </p>
                            </div>
                            <span className="text-purple-400 text-xl">→</span>
                            <div>
                              <p className="text-xs text-purple-600">Max</p>
                              <p className="text-lg font-bold text-purple-900">
                                {formatCurrency(originalOffer.maxPrice)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-purple-600 mt-2">
                            Potential savings: Up to{" "}
                            {formatCurrency(
                              calculatePotentialSavings(
                                originalOffer.minPrice,
                                offer.productId?.price
                              )
                            )}
                          </p>
                          {originalOffer.note && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <p className="text-xs text-purple-700 italic">
                                Your note: "{originalOffer.note}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* COUNTERED Status - Vendor made a counter-offer */}
                        {offer.status === "COUNTERED" && latestCounter && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-2 mb-3">
                              <FiRefreshCw className="text-blue-600" />
                              <span className="font-semibold text-blue-900 text-sm">
                                Vendor Counter-Offer
                              </span>
                            </div>

                            {/* Vendor's Counter Range */}
                            <div className="bg-white rounded-lg p-3 mb-3">
                              <p className="text-xs text-blue-700 font-medium mb-2">
                                Vendor's proposed range:
                              </p>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-600">Min</p>
                                  <p className="text-base font-bold text-blue-900">
                                    {formatCurrency(latestCounter.minPrice)}
                                  </p>
                                </div>
                                <FiArrowRight className="text-blue-400" />
                                <div>
                                  <p className="text-xs text-gray-600">Max</p>
                                  <p className="text-base font-bold text-blue-900">
                                    {formatCurrency(latestCounter.maxPrice)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Vendor's Note */}
                            {latestCounter.note && (
                              <div className="bg-white rounded-lg p-3 mb-3">
                                <p className="text-xs text-blue-700 font-medium mb-1">
                                  Vendor's message:
                                </p>
                                <p className="text-xs text-blue-900 italic">
                                  "{latestCounter.note}"
                                </p>
                              </div>
                            )}

                            {/* Response Options */}
                            {!isResponding ? (
                              <div className="space-y-2">
                                <button
                                  onClick={() =>
                                    handleRespondToCounter(offer._id, "ACCEPT_COUNTER")
                                  }
                                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <FiCheck className="w-4 h-4" />
                                  Accept Counter-Offer
                                </button>
                                <button
                                  onClick={() => setRespondingToOffer(offer._id)}
                                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <FiRefreshCw className="w-4 h-4" />
                                  Make Another Counter
                                </button>
                                <button
                                  onClick={() =>
                                    handleRespondToCounter(offer._id, "DECLINE_COUNTER")
                                  }
                                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <FiX className="w-4 h-4" />
                                  Decline Counter
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
                                    placeholder="Enter maximum price"
                                    min="1"
                                    step="1"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-700 font-medium block mb-1">
                                    Message (Optional)
                                  </label>
                                  <textarea
                                    value={counterForm.customerNote}
                                    onChange={(e) =>
                                      setCounterForm({
                                        ...counterForm,
                                        customerNote: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none text-gray-900 placeholder-gray-500"
                                    rows="2"
                                    placeholder="Add a message..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleRespondToCounter(offer._id, "COUNTER_BACK")
                                    }
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                                  >
                                    Send Counter
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRespondingToOffer(null);
                                      setCounterForm({
                                        counterMinPrice: "",
                                        counterMaxPrice: "",
                                        customerNote: "",
                                      });
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PENDING Status */}
                        {offer.status === "PENDING" && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FiClock className="text-yellow-600" />
                              <span className="font-semibold text-yellow-900 text-sm">
                                Awaiting Response
                              </span>
                            </div>
                            <p className={`text-xs ${timeRemaining.color} font-medium`}>
                              {timeRemaining.text}
                            </p>
                          </div>
                        )}

                        {/* ACCEPTED Status */}
                        {offer.status === "ACCEPTED" && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FiCheck className="text-green-600" />
                              <span className="font-semibold text-green-900 text-sm">
                                ✓ Offer Accepted!
                              </span>
                            </div>
                            {offer.vendorResponse && (
                              <div className="mb-3">
                                <p className="text-xs text-green-700 font-medium mb-1">
                                  Vendor's message:
                                </p>
                                <p className="text-xs text-green-800 italic bg-green-100 p-2 rounded">
                                  "{offer.vendorResponse}"
                                </p>
                              </div>
                            )}
                            <Link
                              href={`/dashboard/customer/chat/${offer.conversationId}`}
                              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                            >
                              <FiMessageCircle className="w-4 h-4" />
                              Continue Negotiation
                            </Link>
                          </div>
                        )}

                        {/* DECLINED Status */}
                        {offer.status === "DECLINED" && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FiX className="text-red-600" />
                              <span className="font-semibold text-red-900 text-sm">
                                Offer Declined
                              </span>
                            </div>
                            {offer.vendorResponse && (
                              <div className="mb-3">
                                <p className="text-xs text-red-700 font-medium mb-1">
                                  Vendor's reason:
                                </p>
                                <p className="text-xs text-red-800 italic bg-red-100 p-2 rounded">
                                  "{offer.vendorResponse}"
                                </p>
                              </div>
                            )}
                            <Link
                              href={`/dashboard/customer/products/${offer.productId?._id}`}
                              className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-all text-center block"
                            >
                              Try Different Offer
                            </Link>
                          </div>
                        )}

                        {/* EXPIRED Status */}
                        {offer.status === "EXPIRED" && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FiAlertCircle className="text-gray-600" />
                              <span className="font-semibold text-gray-900 text-sm">
                                Offer Expired
                              </span>
                            </div>
                            <Link
                              href={`/dashboard/customer/products/${offer.productId?._id}`}
                              className="w-full py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-all text-center block"
                            >
                              Submit New Offer
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Submitted: {formatDate(offer.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/customer/products/${offer.productId?._id}`}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View Product
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}