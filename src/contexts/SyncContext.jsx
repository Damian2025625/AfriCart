"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [counts, setCounts] = useState({
    notifications: 0,
    messages: 0,
    offers: 0,
    cart: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchSyncData = useCallback(async () => {
    // Only fetch if tab is visible to save resources
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/me/sync", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setCounts(data.counts);
      }
    } catch (error) {
      console.error("Pulse sync failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncData();

    // Use a single, reasonably timed interval for all "meta" counts
    // 30 seconds is a good balance between "real-time" and "performant"
    const pulse = setInterval(fetchSyncData, 30000);

    // Also listen for specific local events to refresh immediately
    const handleLocalUpdate = () => fetchSyncData();
    window.addEventListener("cartUpdated", handleLocalUpdate);
    window.addEventListener("syncRequired", handleLocalUpdate);

    return () => {
      clearInterval(pulse);
      window.removeEventListener("cartUpdated", handleLocalUpdate);
      window.removeEventListener("syncRequired", handleLocalUpdate);
    };
  }, [fetchSyncData]);

  return (
    <SyncContext.Provider value={{ counts, loading, refresh: fetchSyncData }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
