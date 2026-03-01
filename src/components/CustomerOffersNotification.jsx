"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiTag, FiCheck, FiClock } from "react-icons/fi";

export default function CustomerOffersNotification() {
  const [offersCount, setOffersCount] = useState({
    pending: 0,
    accepted: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffersCount();
    const interval = setInterval(fetchOffersCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOffersCount = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/offers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const offers = data.offers || [];
        setOffersCount({
          pending: offers.filter((o) => o.status === "PENDING").length,
          accepted: offers.filter((o) => o.status === "ACCEPTED").length,
          total: offers.length,
        });
      }
    } catch (error) {
      console.error("Error fetching offers count:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || offersCount.total === 0) return null;

  return (
    <Link
      href="/customer/offers"
      className="fixed bottom-6 right-6 z-50 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="relative">
          <FiTag className="w-5 h-5" />
          {offersCount.pending > 0 && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">
                {offersCount.pending}
              </span>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <p className="text-xs font-semibold leading-none mb-1">My Offers</p>
          <div className="flex items-center gap-2 text-[10px]">
            {offersCount.pending > 0 && (
              <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                {offersCount.pending} pending
              </span>
            )}
            {offersCount.accepted > 0 && (
              <span className="flex items-center gap-1">
                <FiCheck className="w-3 h-3" />
                {offersCount.accepted} accepted
              </span>
            )}
          </div>
        </div>

        {offersCount.pending > 0 && (
          <div className="sm:hidden absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-white text-[10px] font-bold">
              {offersCount.pending}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}