"use client";

import React, { useState } from "react";
import { FiShoppingCart, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't allow submission if rate limited
    if (isRateLimited) {
      toast.error(rateLimitMessage);
      return;
    }

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      // Handle rate limiting (429 status)
      if (response.status === 429) {
        setIsRateLimited(true);
        setRateLimitMessage(data.message || 'Too many attempts. Please try again later.');
        toast.error(data.message || 'Too many login attempts', {
          duration: 5000,
          icon: '🚫',
        });
        return;
      }

      // Handle successful login
      if (response.ok && data.success) {
        // Clear any rate limit state
        setIsRateLimited(false);
        setRateLimitMessage("");

        // Save token to localStorage
        localStorage.setItem('authToken', data.token);

        // Show success toast
        toast.success(
          `Welcome back${data.user.firstName ? ', ' + data.user.firstName : ''}! 🎉`,
          { duration: 2000 }
        );

        // Redirect based on role
        setTimeout(() => {
          if (data.user.role === 'VENDOR') {
            router.push('/dashboard/vendor');
          } else if (data.user.role === 'ADMIN') {
            router.push('/dashboard/admin');
          } else {
            router.push('/dashboard/customer');
          }
        }, 1000);
      } else {
        // Handle login failure
        toast.error(data.message || 'Login failed');
        
        // If there are validation errors, show them
        if (data.errors && Array.isArray(data.errors)) {
          const errorObj = {};
          data.errors.forEach(err => {
            if (err.includes('email')) errorObj.email = err;
            if (err.includes('password')) errorObj.password = err;
          });
          setErrors(errorObj);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-green-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-orange-500 to-green-600 rounded-2xl mb-4 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            <FiShoppingCart className="text-3xl text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm">
            Sign in to continue shopping or managing your store
          </p>
        </div>

        {/* Rate Limit Warning Banner */}
        {isRateLimited && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Account Temporarily Locked
              </h3>
              <p className="text-sm text-red-700">
                {rateLimitMessage}
              </p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl text-sm p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isRateLimited}
                  className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } ${
                    isRateLimited ? "bg-gray-100 cursor-not-allowed" : ""
                  } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-900`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isRateLimited}
                  className={`block w-full h-11 pl-10 pr-12 py-2.5 border outline-none ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } ${
                    isRateLimited ? "bg-gray-100 cursor-not-allowed" : ""
                  } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-900`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isRateLimited}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isRateLimited}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className={`ml-2 text-sm text-gray-700 group-hover:text-gray-900 ${isRateLimited ? 'opacity-50' : ''}`}>
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isRateLimited}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                isLoading || isRateLimited
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-linear-to-r from-orange-500 to-green-600 hover:from-orange-600 hover:to-green-700 active:scale-98 shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : isRateLimited ? (
                <span>Account Locked</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/register/customer"
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-purple-600 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-purple-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}