"use client";

import React from "react";
import Link from "next/link";
import { FiTag, FiClock } from "react-icons/fi";
import { useSync } from "@/contexts/SyncContext";

export default function CustomerOffersNotification() {
  const { counts } = useSync();

  if (counts.offers === 0) return null;

  return (
    <Link
      href="/customer/offers"
      className="fixed bottom-6 right-6 z-50 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="relative">
          <FiTag className="w-5 h-5" />
          {counts.offers > 0 && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">
                {counts.offers}
              </span>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <p className="text-xs font-semibold leading-none mb-1">My Offers</p>
          <div className="flex items-center gap-2 text-[10px]">
            {counts.offers > 0 && (
              <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                {counts.offers} pending
              </span>
            )}
          </div>
        </div>

        {counts.offers > 0 && (
          <div className="sm:hidden absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-white text-[10px] font-bold">
              {counts.offers}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}