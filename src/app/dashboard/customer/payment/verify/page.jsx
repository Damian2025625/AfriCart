"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCheck, FiX, FiLoader } from "react-icons/fi";
import toast from "react-hot-toast";

export default function PaymentVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your payment...");
  const [orderNumber, setOrderNumber] = useState(null);

  const hasCalledApi = useRef(false);

  useEffect(() => {
    // Paystack callback sends: ?reference=xxx&trxref=xxx
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (reference) {
      if (!hasCalledApi.current) {
        verifyPayment(reference);
      }
    } else if (searchParams.get("status") === "cancelled") {
      setStatus("failed");
      setMessage("Payment was cancelled. Please try again.");
    } else {
      setStatus("failed");
      setMessage("No payment reference found. Please contact support.");
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    hasCalledApi.current = true;

    try {
      // Guard: already verified in this browser session?
      const verifiedKey = `payment_verified_${reference}`;
      const alreadyVerified = localStorage.getItem(verifiedKey);

      if (alreadyVerified) {
        const cachedOrderNumber = localStorage.getItem(`order_number_${reference}`);
        setStatus("success");
        setMessage("Payment already verified!");
        setOrderNumber(cachedOrderNumber);
        setTimeout(() => {
          router.replace(
            cachedOrderNumber
              ? `/dashboard/customer/orders/${cachedOrderNumber}`
              : "/dashboard/customer/orders"
          );
        }, 1500);
        return;
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      console.log("📤 Calling Paystack verification API for:", reference);

      const response = await fetch(
        `/api/payment/verify?reference=${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (data.success) {
        const orderNum = data.data.order?.orderNumber;

        localStorage.setItem(verifiedKey, "true");
        if (orderNum) localStorage.setItem(`order_number_${reference}`, orderNum);

        setStatus("success");
        setMessage("Payment successful! Your order has been placed.");
        setOrderNumber(orderNum);

        window.dispatchEvent(new Event("cartUpdated"));
        localStorage.removeItem("pendingOrder");

        toast.success("Payment successful! 🎉");

        setTimeout(() => {
          router.replace(
            orderNum
              ? `/dashboard/customer/orders/${orderNum}`
              : "/dashboard/customer/orders"
          );
        }, 2000);
      } else {
        setStatus("failed");
        setMessage(data.message || "Payment verification failed");
        toast.error(data.message || "Payment failed");
      }
    } catch (error) {
      console.error("❌ Payment verification error:", error);
      setStatus("failed");
      setMessage("An error occurred while verifying payment");
      toast.error("Verification error");
    }
  };


  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-8 sm:p-12 max-w-md w-full text-center relative z-10 overflow-hidden">
        
        {/* Animated Top Border */}
        {status === "verifying" && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 bg-[length:200%_auto] animate-gradient-x" />
        )}
        {status === "success" && (
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
        )}
        {status === "failed" && (
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        )}

        {status === "verifying" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="relative w-24 h-24 mb-8">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
              {/* Inner pulsing circle */}
              <div className="absolute inset-3 rounded-full bg-orange-50 animate-pulse flex items-center justify-center">
                <FiLoader className="w-8 h-8 text-orange-500 animate-[spin_3s_linear_infinite]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
              Securing Payment
            </h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {message} We're securely communicating with your bank.
            </p>
            
            {/* Skeleton Loading Steps */}
            <div className="w-full space-y-4">
              <div className="h-12 w-full bg-gray-100/80 rounded-xl animate-pulse flex items-center px-4">
                <div className="w-4 h-4 rounded-full bg-gray-200 mr-3"></div>
                <div className="h-2 rounded bg-gray-200 w-1/2"></div>
              </div>
              <div className="h-12 w-full bg-gray-100/50 rounded-xl animate-pulse flex items-center px-4 delay-150">
                <div className="w-4 h-4 rounded-full bg-gray-200 mr-3 opacity-50"></div>
                <div className="h-2 rounded bg-gray-200 w-1/3 opacity-50"></div>
              </div>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-slide-up">
            {/* Confetti dot pattern behind success check */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-green-400 filter blur-2xl opacity-20 -m-4 rounded-full"></div>
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center relative z-10 transform scale-0 animate-[pop-in_0.5s_ease-out_forwards]">
                <FiCheck className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
            </div>
            
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Payment Complete!
            </h2>
            <p className="text-gray-500 mb-8">{message}</p>
            
            {orderNumber && (
              <div className="w-full bg-[#f3fbf6] border border-green-100 rounded-2xl p-6 mb-8 transform transition-all hover:scale-[1.02]">
                <p className="text-xs uppercase tracking-widest text-green-600/80 font-bold mb-1">
                  Order Reference
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-bold text-green-800 tracking-wider">
                    {orderNumber}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
              Redirecting to your dashboard...
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center animate-shake">
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-red-400 filter blur-2xl opacity-20 -m-4 rounded-full"></div>
               <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-500 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center relative z-10">
                 <FiX className="w-12 h-12 text-white" strokeWidth={3} />
               </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Declined</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{message}</p>
            
            <div className="w-full bg-red-50/50 border border-red-100 rounded-2xl p-4 mb-8">
              <p className="text-xs text-red-600">Your account has not been charged.</p>
            </div>

            <button
              onClick={() => router.replace("/dashboard/customer/checkout")}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:bg-gray-800 transform hover:-translate-y-[1px] transition-all duration-200"
            >
              Return to Checkout
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-in {
          0% { transform: scale(0); }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animate-gradient-x {
          animation: gradient-x 3s linear infinite;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}