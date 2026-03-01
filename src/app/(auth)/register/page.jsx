import React from "react";
import Link from "next/link";
import {
  FiShoppingCart,
  FiArrowRight,
  FiCheck,
  FiStar,
  FiPackage,
  FiMessageSquare,
  FiHeart,
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiShield,
} from "react-icons/fi";
import { BsShop } from "react-icons/bs";

export default function RegisterPage() {
  return (
    <div className="min-h-screen text-black flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-600/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10 group">
        <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-2xl shadow-orange-500/30 group-hover:scale-105 transition-transform">
          A
        </div>
        <span className="text-2xl font-extrabold text-black tracking-tight">
          Afri<span className="text-orange-400">Cart</span>
        </span>
      </Link>

      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-3 leading-tight">
          Join the AfriCart Community
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-md">
          Nigeria's fastest-growing marketplace — choose how you want to get started today.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">

        {/* ── Customer Card ── */}
        <div className="group relative bg-white/5 border border-black/10 hover:border-orange-500/50 backdrop-blur-sm rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 flex flex-col">
          {/* Top badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
              <FiShoppingCart className="text-2xl text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-orange-500/15 text-orange-400 rounded-full border border-orange-500/20">
              Free Account
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-black mb-1">
            I&apos;m a Customer
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Discover and buy amazing products from verified African vendors.
          </p>

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {[
              { icon: FiPackage,       text: "Track orders in real time" },
              { icon: FiMessageSquare, text: "Chat directly with vendors" },
              { icon: FiHeart,         text: "Save to your wishlist" },
              { icon: FiStar,          text: "Leave reviews & ratings" },
              { icon: FiShield,        text: "Secure, encrypted checkout" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-gray-500 text-sm">
                <div className="w-6 h-6 bg-orange-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="text-orange-400 text-xs" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          <Link
            href="/register/customer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] text-sm"
          >
            Sign Up as Customer
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ── Vendor Card ── */}
        <div className="group relative bg-white/5 border border-black/10 hover:border-green-500/50 backdrop-blur-sm rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1 flex flex-col">
          {/* Popular badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="text-[10px] font-extrabold px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg shadow-green-500/30 whitespace-nowrap tracking-wide uppercase">
              Start Earning
            </span>
          </div>

          {/* Top badge */}
          <div className="flex items-center justify-between mb-6 mt-2">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
              <BsShop className="text-2xl text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-green-500/15 text-green-400 rounded-full border border-green-500/20">
              Free to List
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-black mb-1">
            I&apos;m a Vendor
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Sell your products and grow your business to thousands of customers.
          </p>

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {[
              { icon: FiPackage,     text: "List unlimited products" },
              { icon: FiTrendingUp,  text: "Real-time analytics & insights" },
              { icon: FiDollarSign,  text: "Fast bank payouts via Paystack" },
              { icon: FiMessageSquare, text: "Chat with your customers" },
              { icon: FiUsers,       text: "Build a loyal customer base" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-gray-500 text-sm">
                <div className="w-6 h-6 bg-green-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="text-green-400 text-xs" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          <Link
            href="/register/vendor"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] text-sm"
          >
            Sign Up as Vendor
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Bottom links */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-gray-500 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">
            Login here
          </Link>
        </p>
        <Link href="/" className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
          ← Back to storefront
        </Link>
      </div>
    </div>
  );
}