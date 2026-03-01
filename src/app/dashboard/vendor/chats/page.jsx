"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FiMessageSquare, 
  FiPackage, 
  FiMoreVertical,
  FiTrash2,
  FiArchive,
  FiStar,
  FiX,
  FiUsers,
  FiShoppingBag,
  FiInbox
} from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";

export default function VendorChatInboxPage() {
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [menuOpen, setMenuOpen] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      // Fetch active conversations
      const response = await fetch("/api/vendor/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
      }

      // Fetch archived conversations
      const archivedResponse = await fetch("/api/vendor/conversations/archived", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const archivedData = await archivedResponse.json();
      
      if (archivedData.success) {
        setArchivedConversations(archivedData.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (conversationId, action, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const token = localStorage.getItem("authToken");
      
      if (action === 'delete') {
        if (!confirm("Delete this conversation? This action cannot be undone.")) return;
        
        const response = await fetch(`/api/vendor/conversations/${conversationId}/manage`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
          toast.success("Conversation deleted");
          setConversations(conversations.filter(c => c._id !== conversationId));
          setArchivedConversations(archivedConversations.filter(c => c._id !== conversationId));
        } else {
          toast.error(data.message || "Failed to delete");
        }
      } else {
        const response = await fetch(`/api/vendor/conversations/${conversationId}/manage`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        });

        const data = await response.json();
        if (data.success) {
          const actionMessages = {
            pin: "Conversation pinned",
            unpin: "Conversation unpinned",
            archive: "Conversation archived",
            unarchive: "Conversation restored",
            markUnread: "Marked as unread"
          };
          toast.success(actionMessages[action]);
          await fetchConversations();
        } else {
          toast.error(data.message || "Action failed");
        }
      }
    } catch (error) {
      console.error("Action error:", error);
      toast.error("Action failed");
    }
    setMenuOpen(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m`;
    
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 48) return "Yesterday";
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Filter conversations based on active tab
  const getDisplayedConversations = () => {
    if (activeTab === "archived") {
      return archivedConversations;
    }
    
    if (activeTab === "all") return conversations;
    if (activeTab === "customers") return conversations;
    if (activeTab === "vendors") return [];
    return conversations;
  };

  const displayedConversations = getDisplayedConversations();
  const pinnedConvs = displayedConversations.filter(c => c.isPinned);
  const recentConvs = displayedConversations.filter(c => !c.isPinned);
  
  // Calculate real counts
  const allCount = conversations.length;
  const customersCount = conversations.length;
  const vendorsCount = 0;
  const archivedCount = archivedConversations.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Tabs - Responsive */}
        <div className="border-b border-gray-200 px-3 sm:px-6 pt-3 sm:pt-4 overflow-x-auto">
          <div className="flex gap-2 sm:gap-6 min-w-max">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-2 w-full md:w-auto sm:pb-3 text-xs sm:text-sm font-medium relative whitespace-nowrap ${
                activeTab === "all" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              <span className="hidden sm:inline">All Messages</span>
              <FiInbox className="sm:hidden w-4 h-4 mx-auto mb-1" />
              <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold ${
                activeTab === "all" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
              }`}>
                {allCount}
              </span>
              {activeTab === "all" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab("vendors")}
              className={`pb-2 w-full md:w-auto sm:pb-3 text-xs sm:text-sm font-medium relative whitespace-nowrap ${
                activeTab === "vendors" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              <span className="hidden sm:inline">Vendors</span>
              <FiShoppingBag className="sm:hidden w-4 h-4 mx-auto mb-1" />
              <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold ${
                activeTab === "vendors" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
              }`}>
                {vendorsCount}
              </span>
              {activeTab === "vendors" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab("customers")}
              className={`pb-2 w-full md:w-auto sm:pb-3 text-xs sm:text-sm font-medium relative whitespace-nowrap ${
                activeTab === "customers" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              <span className="hidden sm:inline">Customers</span>
              <FiUsers className="sm:hidden w-4 h-4 mx-auto mb-1" />
              <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold ${
                activeTab === "customers" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
              }`}>
                {customersCount}
              </span>
              {activeTab === "customers" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab("archived")}
              className={`pb-2 w-full md:w-auto sm:pb-3 text-xs sm:text-sm font-medium relative whitespace-nowrap ${
                activeTab === "archived" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              <span className="hidden sm:inline">Archived</span>
              <FiArchive className="sm:hidden w-4 h-4 mx-auto mb-1" />
              {archivedCount > 0 && (
                <span className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "archived" ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {archivedCount}
                </span>
              )}
              {activeTab === "archived" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>
          </div>
        </div>

        {/* Pinned */}
        {pinnedConvs.length > 0 && activeTab !== "archived" && (
          <>
            <div className="px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase">
              <FiStar className="w-3 h-3" />
              Pinned
            </div>
            {pinnedConvs.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                formatTime={formatTime}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                handleAction={handleAction}
                isArchived={activeTab === "archived"}
              />
            ))}
          </>
        )}

        {/* Recent / Archived */}
        <div className="px-3 sm:px-6 py-2 text-xs font-medium text-gray-500 uppercase">
          {activeTab === "archived" ? "Archived" : "Recent"}
        </div>
        
        {displayedConversations.length === 0 ? (
          <div className="px-3 sm:px-6 py-12 sm:py-16 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              {activeTab === "archived" ? (
                <FiArchive className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
              ) : (
                <FiMessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
              )}
            </div>
            <h3 className="text-sm sm:text-base font-medium text-gray-600 mb-1">
              {activeTab === "archived" ? "No archived conversations" : "No messages yet"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              {activeTab === "archived" 
                ? "Archived conversations will appear here" 
                : "Customer conversations will appear here"}
            </p>
          </div>
        ) : recentConvs.length === 0 && pinnedConvs.length > 0 ? (
          <div className="px-3 sm:px-6 py-8 sm:py-12 text-center">
            <p className="text-xs sm:text-sm text-gray-400">All conversations are pinned</p>
          </div>
        ) : (
          recentConvs.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              formatTime={formatTime}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              handleAction={handleAction}
              isArchived={activeTab === "archived"}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({ conversation, formatTime, menuOpen, setMenuOpen, handleAction, isArchived }) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <div className="relative hover:bg-gray-50 border-b border-gray-100">
      <Link 
        href={`/dashboard/vendor/chats/${conversation._id}`} 
        className="px-3 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-3 items-start"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 bg-linear-to-br rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base ${
            isArchived ? 'from-gray-400 to-gray-500' : 'from-orange-400 to-orange-600'
          }`}>
            {conversation.customer?.firstName?.charAt(0) || "C"}
          </div>
          {!isArchived && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <h3 className={`font-semibold text-xs sm:text-sm truncate ${isArchived ? 'text-gray-500' : 'text-gray-900'}`}>
              {conversation.customer?.firstName} {conversation.customer?.lastName}
            </h3>
            {conversation.isPinned && (
              <FiStar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400 fill-orange-400 shrink-0" />
            )}
            {isArchived && (
              <span className="hidden sm:inline px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                Archived
              </span>
            )}
            {!isArchived && (
              <span className="hidden sm:inline px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                Customer
              </span>
            )}
          </div>

          {conversation.product && (
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <FiPackage className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
              <span className={`text-[10px] sm:text-xs truncate ${isArchived ? 'text-gray-400' : 'text-gray-500'}`}>
                Re: {conversation.product.name}
              </span>
            </div>
          )}

          {conversation.lastMessage && (
            <p className={`text-xs sm:text-sm truncate ${
              isArchived ? 'text-gray-400' :
              hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'
            }`}>
              {conversation.lastMessage}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
          <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${isArchived ? 'text-gray-400' : 'text-orange-500'}`}>
            {formatTime(conversation.lastMessageAt)}
          </span>
          {hasUnread && !isArchived && (
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] sm:text-xs font-bold">{conversation.unreadCount}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(menuOpen === conversation._id ? null : conversation._id);
        }}
        className="absolute right-2 sm:right-4 bottom-3 sm:bottom-4 p-1 sm:p-1.5 hover:bg-gray-200 rounded transition-colors"
      >
        <FiMoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen === conversation._id && (
        <div 
          className="absolute right-2 sm:right-6 top-12 w-44 sm:w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {!isArchived && (
            <>
              <button
                onClick={(e) => handleAction(conversation._id, conversation.isPinned ? 'unpin' : 'pin', e)}
                className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <FiStar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {conversation.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => handleAction(conversation._id, 'archive', e)}
                className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <FiArchive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Archive
              </button>
              <button
                onClick={(e) => handleAction(conversation._id, 'markUnread', e)}
                className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <FiMessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Mark as unread
              </button>
            </>
          )}
          
          {isArchived && (
            <button
              onClick={(e) => handleAction(conversation._id, 'unarchive', e)}
              className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors"
            >
              <FiArchive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Restore
            </button>
          )}
          
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={(e) => handleAction(conversation._id, 'delete', e)}
            className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}