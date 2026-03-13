"use client";

import React, { useState, useEffect } from "react";
import { FiWifiOff, FiWifi } from "react-icons/fi";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      // Auto-hide the "Back online" message after 5 seconds
      const timer = setTimeout(() => setShowBackOnline(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on mount
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] transition-all duration-500 ease-in-out">
        <div className="bg-red-600/95 backdrop-blur-md text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-xl border-b border-red-500/50">
          <div className="bg-red-500/30 p-1.5 rounded-full animate-pulse">
            <FiWifiOff className="w-4 h-4 text-white" />
          </div>
          <p className="text-xs md:text-sm font-bold tracking-wide">
            You're currently offline. Some features may be limited.
          </p>
        </div>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] animate-in slide-in-from-top duration-500 ease-out">
        <div className="bg-green-600/95 backdrop-blur-md text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-xl border-b border-green-500/50">
          <div className="bg-green-500/30 p-1.5 rounded-full">
            <FiWifi className="w-4 h-4 text-white" />
          </div>
          <p className="text-xs md:text-sm font-bold tracking-wide">
            You're back online! Connectivity restored.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
