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
  FiTag,
  FiCheckCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import ChatInput from "@/components/ChatInput";

export default function VendorChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Custom pricing modal
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [priceNotes, setPriceNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [existingCustomPrice, setExistingCustomPrice] = useState(null);

  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);
  const lastMessageIdRef = useRef(null);
  const isFetchingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initialize = async () => {
      await fetchCurrentUser();
      await fetchConversation();
      await fetchMessages();
    };

    initialize();
  }, [conversationId]);

  // Fetch custom price after conversation is loaded
  useEffect(() => {
    if (conversation?.product?._id && conversation?.customer?._id) {
      console.log("Conversation loaded, fetching custom price...");
      fetchCustomPrice();
    }
  }, [conversation]);

  // Setup real-time polling
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    console.log("🔄 Setting up real-time polling for:", conversationId);

    pollingInterval.current = setInterval(() => {
      fetchNewMessages();
    }, 1000);

    return () => {
      if (pollingInterval.current) {
        console.log("⏹️ Stopping polling");
        clearInterval(pollingInterval.current);
      }
    };
  }, [conversationId, currentUser]);

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

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/vendor/conversations/${conversationId}`,
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

  const fetchMessages = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/vendor/conversations/${conversationId}/messages`,
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

        if (fetchedMessages.length > 0) {
          lastMessageIdRef.current =
            fetchedMessages[fetchedMessages.length - 1]._id;
        }

        console.log("✅ Messages loaded:", fetchedMessages.length);
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomPrice = async () => {
  try {
    if (!conversation?.product?._id || !conversation?.customer?._id) {
      console.log("Missing product or customer ID in fetchCustomPrice");
      return;
    }

    const token = localStorage.getItem("authToken");

    const response = await fetch(
      `/api/vendor/custom-price?productId=${conversation.product._id}&customerId=${conversation.customer._id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success && data.customPrice) {
      console.log("Existing custom price found:", data.customPrice);
      setExistingCustomPrice(data.customPrice);
      setCustomPrice(data.customPrice.customPrice.toString());
      setPriceNotes(data.customPrice.notes || "");
    } else {
      console.log("No existing custom price found");
    }
  } catch (error) {
    console.error("Error in fetchCustomPrice:", error);
  }
};

  const fetchNewMessages = async () => {
  if (isFetchingRef.current || sending) return; // ✅ Added sending check

  try {
    isFetchingRef.current = true;

    const token = localStorage.getItem("authToken");
    const lastMessageId = lastMessageIdRef.current;

    const url = lastMessageId
      ? `/api/vendor/conversations/${conversationId}/messages?after=${lastMessageId}`
      : `/api/vendor/conversations/${conversationId}/messages`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success && data.messages && data.messages.length > 0) {
      const newMessages = data.messages;

      console.log(`📬 ${newMessages.length} new message(s) received`);

      setMessages((current) => {
        // ✅ Filter out temp messages AND check for duplicates
        const existingIds = new Set(
          current
            .filter(m => !m._id.startsWith('temp-'))
            .map(m => m._id)
        );
        const uniqueNewMessages = newMessages.filter(
          (m) => !existingIds.has(m._id)
        );

        if (uniqueNewMessages.length > 0) {
          lastMessageIdRef.current =
            uniqueNewMessages[uniqueNewMessages.length - 1]._id;

          // Remove temp messages and add real ones
          const withoutTemp = current.filter(m => !m._id.startsWith('temp-'));
          return [...withoutTemp, ...uniqueNewMessages];
        }

        return current;
      });

      await markMessagesAsRead();
    }
  } catch (error) {
    console.error("Error polling messages:", error);
  } finally {
    isFetchingRef.current = false;
  }
};

  const markMessagesAsRead = async () => {
    try {
      if (!currentUser) return;

      const token = localStorage.getItem("authToken");

      await fetch(
        `/api/vendor/conversations/${conversationId}/mark-read`,
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

  const handleSendMessage = async (messageText, attachmentsArr = []) => {
    if ((!messageText || !messageText.trim()) && (!attachmentsArr || attachmentsArr.length === 0)) return;
    if (!currentUser) return;

    const messageContent = messageText ? messageText.trim() : "";
    setSending(true);

    // Optimistic update
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
        `/api/vendor/conversations/${conversationId}/messages`,
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
        setMessages((current) => {
          const filtered = current.filter(
            (m) => m._id !== optimisticMessage._id && m._id !== data.message._id
          );
          return [...filtered, data.message];
        });

        lastMessageIdRef.current = data.message._id;

        console.log("✅ Message sent");
      } else {
        setMessages((current) =>
          current.filter((m) => m._id !== optimisticMessage._id)
        );
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      setMessages((current) =>
        current.filter((m) => m._id !== optimisticMessage._id)
      );
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleOfferCustomPrice = async () => {
    if (!customPrice || parseFloat(customPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!conversation?.product?._id || !conversation?.customer?._id) {
      toast.error("Missing product or customer information");
      return;
    }

    setSavingPrice(true);

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/vendor/custom-price", {
        method: existingCustomPrice ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: conversation.product._id,
          customerId: conversation.customer._id,
          customPrice: parseFloat(customPrice),
          notes: priceNotes.trim() || null,
          expiresAt: expiryDays
            ? new Date(
                Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000
              ).toISOString()
            : null,
          customPriceId: existingCustomPrice?._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Send auto message
        const discountPercent = (
          ((conversation.product.price - parseFloat(customPrice)) /
            conversation.product.price) *
          100
        ).toFixed(0);

        const messageContent = `✅ Special Price Offer!\n\nI'm offering you a custom price for "${
          conversation.product.name
        }":\n\nOriginal Price: ₦${conversation.product.price.toLocaleString()}\nYour Price: ₦${parseFloat(
          customPrice
        ).toLocaleString()}\n\nYou save ${discountPercent}%! 🎉${
          expiryDays ? `\n\nThis offer expires in ${expiryDays} days.` : ""
        }${priceNotes ? `\n\nNote: ${priceNotes}` : ""}`;

        // Send notification message
        await fetch(
          `/api/vendor/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: messageContent,
            }),
          }
        );

        toast.success("Custom price offered successfully!");
        setShowPricingModal(false);
        setExistingCustomPrice(data.customPrice);

        await fetchConversation();
        await fetchCustomPrice();
      } else {
        toast.error(data.message || "Failed to offer custom price");
      }
    } catch (error) {
      console.error("Error offering custom price:", error);
      toast.error("Failed to offer custom price");
    } finally {
      setSavingPrice(false);
    }
  };

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
            href="/dashboard/vendor/chat"
            className="text-orange-500 hover:text-orange-600 text-sm"
          >
            Go back to messages
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
              <div className="w-10 h-10 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                {conversation.customer?.firstName?.charAt(0) || "C"}
              </div>

              <div>
                <h1 className="font-bold text-gray-900 text-sm">
                  {conversation.customer?.firstName}{" "}
                  {conversation.customer?.lastName}
                </h1>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPricingModal(true)}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-semibold flex items-center gap-1"
            >
              <FiTag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offer Price</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <FiPhone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <FiMoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Context Sticky Banner */}
      {conversation.product && (
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between z-10 sticky top-[64px]">
          <div className="flex items-center gap-3">
            {conversation.product.images?.[0] ? (
              <img src={conversation.product.images[0]} alt="product" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <FiPackage className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <p className="text-xs font-semibold text-gray-900 line-clamp-1">{conversation.product.name}</p>
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-orange-600 font-bold">₦{conversation.product.price.toLocaleString()}</p>
                {existingCustomPrice && (
                  <>
                    <span className="text-[10px] text-gray-400">→</span>
                    <p className="text-[11px] text-green-600 font-bold flex items-center gap-0.5">
                      <FiCheckCircle className="w-2.5 h-2.5" />₦{existingCustomPrice.customPrice.toLocaleString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
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

      {/* Custom Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Offer Custom Price
              </h2>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {conversation.product.name}
              </p>
              <p className="text-xs text-gray-500">
                Original Price: ₦
                {conversation.product.price.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Custom Price (₦) *
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Enter custom price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                  min="1"
                  step="0.01"
                />
                {customPrice && parseFloat(customPrice) > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Discount:{" "}
                    {(
                      ((conversation.product.price - parseFloat(customPrice)) /
                        conversation.product.price) *
                      100
                    ).toFixed(0)}
                    % off (₦
                    {(
                      conversation.product.price - parseFloat(customPrice)
                    ).toLocaleString()}{" "}
                    savings)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="Leave empty for no expiry"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={priceNotes}
                  onChange={(e) => setPriceNotes(e.target.value)}
                  placeholder="Add any special conditions or notes..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPricingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOfferCustomPrice}
                  disabled={savingPrice || !customPrice}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {savingPrice
                    ? "Saving..."
                    : existingCustomPrice
                    ? "Update Price"
                    : "Offer Price"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}