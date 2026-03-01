"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiSend,
  FiArrowLeft,
  FiPackage,
  FiPhone,
  FiMoreVertical,
  FiImage,
  FiPaperclip,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import ChatInput from "@/components/ChatInput";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);
  const lastMessageIdRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      await fetchCurrentUser();
      await fetchConversation();
      await fetchMessages();
    };

    initialize();
  }, [conversationId]);

  // Setup aggressive polling for real-time effect (every 1 second)
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    console.log("🔄 Setting up real-time polling for:", conversationId);

    // Poll every 1 second for new messages
    pollingInterval.current = setInterval(() => {
      fetchNewMessages();
    }, 1000); // 1 second interval for real-time feel

    return () => {
      if (pollingInterval.current) {
        console.log("⏹️ Stopping polling");
        clearInterval(pollingInterval.current);
      }
    };
  }, [conversationId, currentUser]);

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user);
        console.log("✅ Current user:", data.user.id);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  // Fetch conversation details
  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/customer/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setConversation(data.conversation);
        console.log("✅ Conversation loaded");
      } else {
        toast.error(data.message || "Failed to load conversation");
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  // Initial fetch of all messages
  const fetchMessages = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/customer/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        const fetchedMessages = data.messages || [];
        setMessages(fetchedMessages);
        
        // Store last message ID for polling
        if (fetchedMessages.length > 0) {
          lastMessageIdRef.current = fetchedMessages[fetchedMessages.length - 1]._id;
        }

        console.log("✅ Messages loaded:", fetchedMessages.length);

        // Mark messages as read
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only NEW messages (for polling)
  // Fetch only NEW messages (for polling)
const fetchNewMessages = async () => {
  // Prevent multiple simultaneous fetches
  if (isFetchingRef.current || sending) return; // ✅ Added sending check
  
  try {
    isFetchingRef.current = true;

    const token = localStorage.getItem("authToken");
    const lastMessageId = lastMessageIdRef.current;

    // Build URL with last message ID
    const url = lastMessageId 
      ? `/api/customer/conversations/${conversationId}/messages?after=${lastMessageId}`
      : `/api/customer/conversations/${conversationId}/messages`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success && data.messages && data.messages.length > 0) {
      const newMessages = data.messages;
      
      console.log(`📬 ${newMessages.length} new message(s) received`);

      // Add new messages to state
      setMessages((current) => {
        // ✅ Filter out temp messages AND check for duplicates by _id
        const existingIds = new Set(
          current
            .filter(m => !m._id.startsWith('temp-')) // Ignore temp messages
            .map(m => m._id)
        );
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id));
        
        if (uniqueNewMessages.length > 0) {
          // Update last message ID
          lastMessageIdRef.current = uniqueNewMessages[uniqueNewMessages.length - 1]._id;
          
          // Remove temp messages and add real ones
          const withoutTemp = current.filter(m => !m._id.startsWith('temp-'));
          return [...withoutTemp, ...uniqueNewMessages];
        }
        
        return current;
      });

      // Mark new messages as read
      await markMessagesAsRead();
    }
  } catch (error) {
    console.error("Error polling messages:", error);
  } finally {
    isFetchingRef.current = false;
  }
};

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      if (!currentUser) return;

      const token = localStorage.getItem("authToken");

      await fetch(
        `/api/customer/conversations/${conversationId}/mark-read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Send message
  const handleSendMessage = async (messageText, attachmentsArr = []) => {
    if ((!messageText || !messageText.trim()) && (!attachmentsArr || attachmentsArr.length === 0)) return;
    if (!currentUser) return;

    const messageContent = messageText ? messageText.trim() : "";
    setSending(true);

    // Optimistic update - add message immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      content: messageContent,
      attachments: attachmentsArr,
      sender: {
        _id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setNewMessage("");

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/customer/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: messageContent,
            attachments: attachmentsArr,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Replace optimistic message with real one
        setMessages((current) => {
          const filtered = current.filter(m => m._id !== optimisticMessage._id && m._id !== data.message._id);
          return [...filtered, data.message];
        });

        // Update last message ID
        lastMessageIdRef.current = data.message._id;

        console.log("✅ Message sent");
      } else {
        // Remove optimistic message on error
        setMessages((current) => current.filter(m => m._id !== optimisticMessage._id));
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages((current) => current.filter(m => m._id !== optimisticMessage._id));
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Conversation not found
          </h2>
          <Link
            href="/dashboard/customer"
            className="text-orange-500 hover:text-orange-600 text-sm"
          >
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              {conversation.vendor?.logoUrl ? (
                <img
                  src={conversation.vendor.logoUrl}
                  alt={conversation.vendor.businessName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {conversation.vendor?.businessName?.charAt(0) || "V"}
                </div>
              )}

              <div>
                <h1 className="font-bold text-gray-900 text-sm">
                  {conversation.vendor?.businessName}
                </h1>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <FiPhone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <FiMoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Context Banner */}
      {conversation.product && (
        <Link
          href={`/dashboard/customer/products/${conversation.product._id}`}
          className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors z-10 sticky top-[64px]"
        >
          <div className="flex items-center gap-3">
            {conversation.product.images?.[0] ? (
              <img src={conversation.product.images[0]} alt="product" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <FiPackage className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <p className="text-xs font-semibold text-gray-900 line-clamp-1">{conversation.product.name}</p>
              <p className="text-[11px] text-orange-600 font-bold">₦{conversation.product.price.toLocaleString()}</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
            View <FiArrowLeft className="w-3 h-3 rotate-180" />
          </span>
        </Link>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender._id === currentUser?.id;
            return (
              <div
                key={message._id}
                className={`flex w-full mb-3 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[65%] flex flex-col relative rounded-2xl shadow-sm ${
                    isOwn 
                      ? "bg-orange-100 text-gray-900 rounded-tr-sm" 
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                  }`}
                >
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="p-1 pb-0 flex flex-col gap-1">
                      {message.attachments.map((attachmentUrl, i) => {
                        const isAudio = attachmentUrl.includes("audio") || attachmentUrl.includes("video") || attachmentUrl.match(/\.(webm|mp3|wav|ogg|m4a)$/i);
                        return (
                          <div key={i} className={`rounded-[14px] overflow-hidden ${isAudio ? (isOwn ? "bg-orange-200/50 p-1" : "bg-gray-100 p-1") : ""}`}>
                            {isAudio ? (
                              <audio src={attachmentUrl} controls className="w-[200px] sm:w-[260px] h-10 outline-none" />
                            ) : (
                              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block w-full cursor-zoom-in">
                                <img src={attachmentUrl} alt="Attachment" className="w-full h-auto max-h-[250px] object-cover rounded-[14px]" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Content */}
                  {message.content && (
                    <div className="px-3.5 pt-1.5 pb-2 text-[15px] leading-snug break-words whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`px-3 pb-1.5 flex justify-end items-center ${!message.content && message.attachments?.length ? "pt-1" : "-mt-1"}`}>
                    <span className={`text-[10px] tracking-wide ${isOwn ? "text-orange-600/70" : "text-gray-400"}`}>
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={sending} />
    </div>
  );
}