"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiSearch, FiShoppingCart, FiHelpCircle, FiArrowLeft } from "react-icons/fi";

export default function NotFoundPage() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-purple-50 to-green-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative floating circles */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-orange-300/30 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-20 h-20 bg-green-300/30 rounded-full blur-xl animate-pulse delay-75"></div>
      <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-purple-300/30 rounded-full blur-xl animate-pulse delay-150"></div>
      <div className="absolute bottom-20 right-10 w-16 h-16 bg-orange-300/30 rounded-full blur-xl animate-pulse delay-300"></div>

      <div className="w-full max-w-2xl text-center">
        {/* Large 404 Text with gradient */}
        <div className="mb-8 relative">
          <h1 className="text-[180px] md:text-[240px] font-black leading-none bg-linear-to-r from-pink-500 via-purple-500 to-blue-600 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Oops! Page Not Found
        </h2>
        
        <p className="text-gray-600 text-lg mb-2 max-w-lg mx-auto">
          Looks like this page wandered off to explore the marketplace. Let's get you back on track!
        </p>

        {/* Requested URL */}
        {pathname && (
          <p className="text-sm text-gray-500 mb-8">
            Requested: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{pathname}</code>
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-xs hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <FiHome size={20} />
            Back to Home
          </Link>
          
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-xs hover:bg-gray-50 text-gray-800 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200"
          >
            <FiSearch size={20} />
            Browse Categories
          </Link>
        </div>

        {/* Quick Links Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl mx-auto border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Quick Links</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Home Link */}
            <Link
              href="/"
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-orange-50 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FiHome className="text-orange-600" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-700">Home</span>
            </Link>

            {/* Categories Link */}
            <Link
              href="/products"
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-orange-50 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FiSearch className="text-orange-600" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-700">Categories</span>
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-orange-50 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FiShoppingCart className="text-orange-600" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-700">Cart</span>
            </Link>

            {/* Help Link */}
            <Link
              href="/help"
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-orange-50 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FiHelpCircle className="text-orange-600" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-700">Help</span>
            </Link>
          </div>
        </div>

        {/* Go Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium mt-8 transition-colors text-xsP"
        >
          <FiArrowLeft size={18} />
          Go back to previous page
        </button>
      </div>
    </div>
  );
}