"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

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

      const response = await axios.get("/api/me/sync", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCounts(response.data.counts);
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

  // Immediately zero the notification badge locally (called when user marks all as read).
  // The next 30-second server poll will restore the count only if genuinely new items exist.
  const clearNotifications = useCallback(() => {
    setCounts((prev) => ({ ...prev, notifications: 0 }));
  }, []);

  return (
    <SyncContext.Provider value={{ counts, loading, refresh: fetchSyncData, clearNotifications }}>
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
