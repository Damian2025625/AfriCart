"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiBell, FiPackage, FiMessageSquare, FiTag, FiClock } from "react-icons/fi";
import { useSync } from "@/contexts/SyncContext";

// Time formatter without needing date-fns
function timeAgo(dateParam) {
  if (!dateParam) return "";
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const today = new Date();
  const seconds = Math.round((today - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function CustomerNotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { counts, refresh } = useSync();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem("readNotifications", JSON.stringify(allIds));
    refresh(); // Update the badge count immediately via sync context
  };

  const handleNotificationClick = (id) => {
    const readNotifsData = localStorage.getItem("readNotifications");
    const readNotifications = readNotifsData ? JSON.parse(readNotifsData) : [];
    
    if (!readNotifications.includes(id)) {
      const newRead = [...readNotifications, id];
      localStorage.setItem("readNotifications", JSON.stringify(newRead));
      refresh();
    }
    setIsOpen(false); // Close dropdown when a notification is clicked
  };

  const getIcon = (type) => {
    switch (type) {
      case "ORDER": return <FiPackage className="text-blue-500 bg-blue-100 p-2 rounded-full w-8 h-8 shrink-0" />;
      case "OFFER": return <FiTag className="text-orange-500 bg-orange-100 p-2 rounded-full w-8 h-8 shrink-0" />;
      case "MESSAGE": return <FiMessageSquare className="text-green-500 bg-green-100 p-2 rounded-full w-8 h-8 shrink-0" />;
      default: return <FiBell className="text-gray-500 bg-gray-100 p-2 rounded-full w-8 h-8 shrink-0" />;
    }
  };

  // Safe client-side local storage read for hydration purposes
  const getIsRead = (id) => {
    if (typeof window === "undefined") return true;
    const readNotifsData = localStorage.getItem("readNotifications");
    const readNotifications = readNotifsData ? JSON.parse(readNotifsData) : [];
    return readNotifications.includes(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Target Bell Icon Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-gray-300 hover:bg-orange-600 group transition-colors duration-200 relative flex items-center justify-center outline-none"
      >
        <FiBell className="text-base text-gray-700 cursor-pointer group-hover:text-white" />
        
        {/* Unread Badge Count */}
        {counts.notifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
            {counts.notifications > 99 ? "99+" : counts.notifications}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transition-all duration-200 origin-top-right ${isOpen ? "transform scale-100 opacity-100 visible" : "transform scale-95 opacity-0 invisible"}`} 
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-gray-900">Notifications</h3>
          {counts.notifications > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-orange-600 font-semibold hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto w-full" style={{ flex: 1, maxHeight: '380px' }}>
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="bg-gray-100 p-3 rounded-full mb-3">
                <FiBell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">You have no new notifications right now.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => {
                const isRead = getIsRead(notif.id);

                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => handleNotificationClick(notif.id)}
                    className={`p-4 border-b border-gray-50 flex gap-3 hover:bg-orange-50 transition-colors duration-200 ${!isRead ? "bg-orange-50/40" : ""}`}
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm ${!isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                          {notif.title}
                        </h4>
                        {!isRead && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className={`text-xs ${!isRead ? "text-gray-800" : "text-gray-500"} leading-snug line-clamp-2`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                        <FiClock className="w-3 h-3" />
                        <span>{timeAgo(notif.date)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gray-100 bg-gray-50 text-center shrink-0">
             <span className="text-[10px] text-gray-400 font-medium">Synced with your dashboard</span>
          </div>
        )}
      </div>
    </div>
  );
}
