"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import localforage from "localforage";
import {
  FiPackage,
  FiShoppingCart,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown,
  FiPlus,
  FiTarget,
  FiZap,
  FiEye,
  FiMessageCircle,
  FiMoreHorizontal,
  FiClock,
  FiUser,
  FiArrowRight,
  FiX,
  FiUpload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function VendorOverview() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [vendorInfo, setVendorInfo] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Add Product Modal States
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentFeature, setCurrentFeature] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    price: "",
    quantity: "",
    sku: "",
    discountPercentage: 0,
    discountStartDate: "",
    discountEndDate: "",
    isActive: true,
    features: [],
  });

  // Offline State
  const [isOffline, setIsOffline] = useState(false);

  const convertImagesToBase64 = async (imageFiles) => {
    const promises = imageFiles.map((file) => {
      if (typeof file === "string") return Promise.resolve(file);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  const syncOfflineProducts = async () => {
    try {
      const queue = await localforage.getItem("offline-product-queue") || [];
      if (queue.length === 0) return;

      const token = localStorage.getItem("authToken");
      if (!token) return;

      toast.loading(`Syncing ${queue.length} offline product(s)...`, { id: "sync-offline" });
      
      let successCount = 0;
      const failedQueue = [];

      for (const productData of queue) {
        try {
          const response = await fetch("/api/vendor/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            successCount++;
          } else {
            failedQueue.push(productData);
          }
        } catch (error) {
          failedQueue.push(productData);
        }
      }

      await localforage.setItem("offline-product-queue", failedQueue);

      toast.dismiss("sync-offline");
      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} offline product(s)!`);
        fetchVendorStats(); // Refresh stats on success
      }
      if (failedQueue.length > 0) {
        toast.error(`Failed to sync ${failedQueue.length} product(s). Will retry later.`);
      }
    } catch (error) {
      console.error("Error syncing offline products:", error);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineProducts();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (typeof navigator !== "undefined") {
      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        syncOfflineProducts();
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load draft when modal opens
  useEffect(() => {
    if (showAddProductModal) {
      const loadDraft = async () => {
        try {
          const draft = await localforage.getItem("vendor-product-draft");
          if (draft) {
             if (draft.formData) {
               setFormData((prev) => ({ ...prev, ...draft.formData }));
               if (draft.selectedImages && Array.isArray(draft.selectedImages)) {
                 setSelectedImages(draft.selectedImages);
               }
             } else {
               setFormData((prev) => ({ ...prev, ...draft }));
             }
             toast("Restored from offline draft", { icon: "📝" });
          }
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      };
      loadDraft();
    }
  }, [showAddProductModal]);

  // Auto-save draft whenever formData changes
  useEffect(() => {
    if (showAddProductModal) {
      const timer = setTimeout(async () => {
        // Skip saving empty draft right after modal reset
        if (formData.name !== "") {
          try {
            const base64Images = await convertImagesToBase64(selectedImages);
            await localforage.setItem("vendor-product-draft", {
              formData,
              selectedImages: base64Images
            });
          } catch(e) {
            console.error("Auto-save failed", e);
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [formData, selectedImages, showAddProductModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchVendorStats();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubcategories(formData.categoryId);
    } else {
      setSubcategories([]);
      setFormData((prev) => ({ ...prev, subcategoryId: "" }));
    }
  }, [formData.categoryId]);

  const fetchVendorStats = async () => {
    try {
      // Get token from localStorage
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;

      if (!token) {
        toast.error("Please log in to view your dashboard");
        router.push("/login");
        return;
      }

      // Fetch vendor stats from MongoDB API
      const response = await fetch("/api/vendor/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setVendorInfo(data.vendor);
        setVendorId(data.vendor.id);

        // Fetch recent orders
        fetchRecentOrders(token);

        // Fetch categories
        fetchCategories();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error fetching vendor stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}/subcategories`
      );
      const data = await response.json();

      if (data.success) {
        setSubcategories(data.subcategories);
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([]);
    }
  };

  const fetchRecentOrders = async (token) => {
    try {
      const response = await fetch("/api/vendor/orders/recent", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setRecentOrders(data.orders);
      }
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      PROCESSING: "bg-purple-100 text-purple-800",
      SHIPPED: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTrendProps = (trendValue) => {
    if (trendValue === undefined || trendValue === null) return { text: "0%", color: "text-gray-500", icon: FiTrendingUp };
    if (trendValue > 0) return { text: `+${trendValue}%`, color: "text-green-600", icon: FiTrendingUp };
    if (trendValue < 0) return { text: `${Math.abs(trendValue)}%`, color: "text-red-600", icon: FiTrendingDown };
    return { text: "0%", color: "text-gray-500", icon: FiTrendingUp };
  };

  const statCards = [
    {
      title: "Total Products",
      value: formatNumber(stats.totalProducts),
      icon: FiPackage,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: getTrendProps(stats.trends?.products).text,
      trendColor: getTrendProps(stats.trends?.products).color,
      trendIcon: getTrendProps(stats.trends?.products).icon,
    },
    {
      title: "Total Orders",
      value: formatNumber(stats.totalOrders),
      icon: FiShoppingCart,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: getTrendProps(stats.trends?.orders).text,
      trendColor: getTrendProps(stats.trends?.orders).color,
      trendIcon: getTrendProps(stats.trends?.orders).icon,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: FiDollarSign,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      trend: getTrendProps(stats.trends?.revenue).text,
      trendColor: getTrendProps(stats.trends?.revenue).color,
      trendIcon: getTrendProps(stats.trends?.revenue).icon,
    },
    {
      title: "Total Customers",
      value: formatNumber(stats.totalCustomers),
      icon: FiUsers,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      trend: getTrendProps(stats.trends?.customers).text,
      trendColor: getTrendProps(stats.trends?.customers).color,
      trendIcon: getTrendProps(stats.trends?.customers).icon,
    },
  ];

  const quickActions = [
    {
      title: "Add New Product",
      description: "List a new product in your store",
      icon: FiPlus,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      cardBg: "bg-orange-50",
      buttonText: "Get Started",
      buttonGradient: "from-orange-500 to-green-600",
      onClick: () => setShowAddProductModal(true),
    },
    {
      title: "Inventory Alert",
      description: "3 products are low in stock",
      icon: FiTarget,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      cardBg: "bg-green-50",
      buttonText: "View Details",
      buttonGradient: "from-white to-white",
      buttonTextColor: "text-gray-900",
      buttonBorder: "border border-gray-200",
      href: "/dashboard/vendor/products",
    },
    {
      title: "Boost Sales",
      description: "Run promotions to increase visibility",
      icon: FiZap,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      cardBg: "bg-purple-50",
      buttonText: "Create Promotion",
      buttonGradient: "from-white to-white",
      buttonTextColor: "text-gray-900",
      buttonBorder: "border border-gray-200",
      href: "/dashboard/vendor/promotions",
    },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValidType = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name} is not a valid image type`);
      if (!isValidSize) toast.error(`${file.name} is too large (max 5MB)`);
      return isValidType && isValidSize;
    });
    setSelectedImages((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addFeature = () => {
    const trimmed = currentFeature.trim();
    if (trimmed && !formData.features.includes(trimmed)) {
      handleInputChange("features", [...formData.features, trimmed]);
      setCurrentFeature("");
    }
  };

  const removeFeature = (index) => {
    handleInputChange(
      "features",
      formData.features.filter((_, i) => i !== index)
    );
  };



  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Product name is required");
    if (!formData.categoryId) return toast.error("Please select a category");
    if (!formData.price || parseFloat(formData.price) <= 0)
      return toast.error("Please enter a valid price");
    if (!formData.quantity || parseInt(formData.quantity) < 0)
      return toast.error("Please enter a valid quantity");
    if (formData.discountPercentage > 0) {
      if (formData.discountStartDate && formData.discountEndDate) {
        const startDate = new Date(formData.discountStartDate);
        const endDate = new Date(formData.discountEndDate);

        if (endDate <= startDate) {
          return toast.error("Discount end date must be after start date");
        }
      }
    }

    setAddProductLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      let base64Images = [];
    if (selectedImages.length > 0) {
      toast.loading("Preparing images...", { id: "image-prep" });
      base64Images = await convertImagesToBase64(selectedImages);
      toast.dismiss("image-prep");
    }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || null,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        sku: formData.sku.trim() || null,
        discountPercentage: parseFloat(formData.discountPercentage) || 0,
        discountStartDate: formData.discountStartDate || null,
        discountEndDate: formData.discountEndDate || null,
        images: base64Images,
        isActive: formData.isActive,
        features: formData.features.length > 0 ? formData.features : null,
      };

      if (isOffline || !navigator.onLine) {
        const queue = await localforage.getItem("offline-product-queue") || [];
        queue.push(productData);
        await localforage.setItem("offline-product-queue", queue);
        
        await localforage.removeItem("vendor-product-draft"); // Clear open draft
        
        toast.success("Saved to offline sync queue. Will automatically upload when you reconnect.");
        setAddProductLoading(false);
        closeModal();
        return;
      }

      toast.loading("Creating product...", { id: "product-create" });

      let response;
      try {
        response = await fetch("/api/vendor/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        });
      } catch (fetchError) {
        if (fetchError instanceof TypeError && (fetchError.message === "Failed to fetch" || fetchError.message.includes("NetworkError"))) {
          const queue = await localforage.getItem("offline-product-queue") || [];
          queue.push(productData);
          await localforage.setItem("offline-product-queue", queue);
          
          await localforage.removeItem("vendor-product-draft"); // Clear open draft
          
          toast.success("Network unreachable. Saved to offline sync queue for auto-upload.", { id: "product-create" });
          setAddProductLoading(false);
          closeModal();
          return;
        }
        throw fetchError;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Product added successfully!", { id: "product-create" });
        await localforage.removeItem("vendor-product-draft"); // Clear draft on success
        setShowAddProductModal(false);
        setFormData({
          name: "",
          description: "",
          categoryId: "",
          subcategoryId: "",
          price: "",
          quantity: "",
          sku: "",
          discountPercentage: 0,
          discountStartDate: "",
          discountEndDate: "",
          isActive: true,
          features: [],
        });
        setSelectedImages([]);
        setSubcategories([]);
        fetchVendorStats();
      } else {
        toast.error(data.message || "Failed to add product", { id: "product-create" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add product", { id: "product-create" });
    } finally {
      setAddProductLoading(false);
    }
  };

  const closeModal = () => {
    setShowAddProductModal(false);
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      price: "",
      quantity: "",
      sku: "",
      discountPercentage: 0,
      discountStartDate: "",
      discountEndDate: "",
      isActive: true,
      features: [],
    });
    setSelectedImages([]);
    setSubcategories([]);
    setCurrentFeature("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500"></div>
            <div className="absolute inset-3 bg-linear-to-br from-orange-500 to-green-600 rounded-full animate-pulse flex items-center justify-center">
              <FiShoppingCart className="text-white text-2xl" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Loading Dashboard
          </h3>
          <p className="text-gray-600 animate-pulse">Fetching your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Overview
        </h1>
      </div>

      {/* Statistics Grid */}
      <div id="overview-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium mb-2">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  <stat.trendIcon className={`text-xs ${stat.trendColor}`} />
                  <span className={`text-xs font-semibold ${stat.trendColor}`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-2xl ${stat.iconBg}`}>
                <stat.icon className={`text-2xl ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div id="overview-actions" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action, index) =>
          action.href ? (
            <Link
              key={index}
              href={action.href}
              className={`${action.cardBg} rounded-2xl p-6 transition-all duration-300 hover:shadow-sm block`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-2xl ${action.iconBg} mb-4`}>
                  <action.icon className={`text-2xl ${action.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-xs mb-4">
                  {action.description}
                </p>
                <div
                  className={`w-full py-2.5 px-6 rounded-lg text-xs font-semibold transition-all duration-300 
                  ${
                    action.buttonGradient
                      ? `bg-linear-to-r ${action.buttonGradient} text-black`
                      : ""
                  }
                  ${action.buttonTextColor || "text-white"}
                  ${action.buttonBorder || ""}
                  ${
                    !action.buttonGradient?.includes("white")
                      ? "hover:opacity-90"
                      : "hover:bg-gray-50"
                  }
                `}
                >
                  {action.buttonText}
                </div>
              </div>
            </Link>
          ) : (
            <button
              key={index}
              id="action-add-product"
              onClick={action.onClick}
              className={`${action.cardBg} rounded-2xl p-6 transition-all duration-300 hover:shadow-sm block w-full text-left`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-2xl ${action.iconBg} mb-4`}>
                  <action.icon className={`text-2xl ${action.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-xs mb-4">
                  {action.description}
                </p>
                <div
                  className={`w-full py-2.5 px-6 rounded-lg text-xs font-semibold transition-all duration-300 bg-linear-to-r ${action.buttonGradient} text-white hover:opacity-90`}
                >
                  {action.buttonText}
                </div>
              </div>
            </button>
          )
        )}
      </div>

      {/* Recent Orders Section */}
      <div id="overview-orders" className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiShoppingCart className="text-orange-600 text-xl" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                Recent Orders
              </h2>
              <p className="text-xs text-gray-600">
                Track your latest customer orders
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/vendor/orders"
            className="flex items-center justify-center md:justify-start gap-2 text-orange-600 hover:text-orange-700 font-semibold text-xs transition-colors"
          >
            View All Orders
            <FiArrowRight />
          </Link>
        </div>

        <div className="p-3 md:p-4">
          {ordersLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p className="text-sm">Loading orders...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiShoppingCart className="mx-auto text-4xl mb-2 text-gray-300" />
              <p className="text-sm">No orders yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Orders will appear here when customers place them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* Icon + Badge */}
                  <div className="shrink-0 self-start md:self-auto">
                    <div className="relative">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FiPackage className="text-orange-600 text-lg md:text-xl" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start md:items-center gap-2 mb-2">
                      <span className="font-bold text-sm md:text-base text-gray-900 break-all">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <FiUser size={12} className="shrink-0" />
                        <span className="truncate">{order.customerName}</span>
                      </div>
                      <span className="hidden sm:inline text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <FiClock size={12} className="shrink-0" />
                        <span className="whitespace-nowrap">
                          {getTimeAgo(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price + Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200">
                    {/* Price Info */}
                    <div className="text-left md:text-right">
                      <div className="text-base md:text-lg font-bold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500">
                        {order.totalItems}{" "}
                        {order.totalItems === 1 ? "item" : "items"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 md:gap-2">
                      <Link href={`/dashboard/vendor/orders/${order.orderNumber}`}>
                        <button
                          className="p-1.5 md:p-2 hover:bg-white rounded-lg transition-colors"
                          title="View details"
                        >
                          <FiEye className="text-gray-600 text-sm md:text-base" />
                        </button>
                      </Link>
                      <button
                        className="p-1.5 md:p-2 hover:bg-white rounded-lg transition-colors"
                        title="Message customer"
                      >
                        <FiMessageCircle className="text-gray-600 text-sm md:text-base" />
                      </button>
                      <button
                        className="p-1.5 md:p-2 hover:bg-white rounded-lg transition-colors"
                        title="More options"
                      >
                        <FiMoreHorizontal className="text-gray-600 text-sm md:text-base" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full my-8">
            {/* Modal header and form - keeping the same structure but updating field names */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Add New Product
                </h1>
                <p className="text-gray-700 mt-1 text-xs">
                  Fill in the details to add a new product to your store
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <FiX className="text-gray-700" size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddProductSubmit}
              className="lg:p-6 p-4 space-y-8 overflow-y-auto max-h-[70vh]"
            >
              {/* Basic Information */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Basic Information
                </h2>
                <p className="text-xs text-gray-600 mb-6">
                  Essential product details
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="e.g., Premium Quality Rice 5kg"
                      className="w-full text-sm text-gray-900 h-11 outline-none px-4 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      rows={4}
                      placeholder="Describe your product features, benefits, and specifications..."
                      className="w-full text-gray-900 outline-none px-4 py-3 border text-sm border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Key Features{" "}
                      <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Add important features one by one
                    </p>

                    {/* Input + Add Button */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={currentFeature}
                        onChange={(e) => setCurrentFeature(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                        placeholder="e.g., Water resistant"
                        className="flex-1 text-sm px-4 py-3 placeholder-gray-400 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={addFeature}
                        disabled={!currentFeature.trim()}
                        className="px-4 py-3 text-xs bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {/* Display Added Features as Chips */}
                    {formData.features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.features.map((feature, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium"
                          >
                            <span>{feature}</span>
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Count */}
                    <p className="text-xs text-gray-500 mt-3">
                      {formData.features.length} feature
                      {formData.features.length !== 1 ? "s" : ""} added
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) =>
                          handleInputChange("categoryId", e.target.value)
                        }
                        className="w-full text-sm text-gray-900 px-4 py-3 h-11 outline-none border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        required
                      >
                        <option value="" className="text-gray-500">
                          Select category
                        </option>
                        {categories.map((cat) => (
                          <option
                            key={cat._id}
                            value={cat._id}
                            className="text-gray-900"
                          >
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.categoryId && subcategories.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Subcategory{" "}
                          <span className="text-gray-500 text-xs">
                            (Optional)
                          </span>
                        </label>
                        <select
                          value={formData.subcategoryId}
                          onChange={(e) =>
                            handleInputChange("subcategoryId", e.target.value)
                          }
                          className="w-full text-sm text-gray-900 px-4 py-3 h-11 outline-none border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        >
                          <option value="" className="text-gray-500">
                            None (use main category only)
                          </option>
                          {subcategories.map((subcat) => (
                            <option
                              key={subcat._id}
                              value={subcat._id}
                              className="text-gray-900"
                            >
                              {subcat.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Select a subcategory for better product organization
                        </p>
                      </div>
                    )}

                    <div
                      className={
                        formData.category_id && subcategories.length > 0
                          ? "md:col-span-2"
                          : ""
                      }
                    >
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Status
                      </label>
                      <select
                        value={String(formData.isActive)}
                        onChange={(e) =>
                          handleInputChange(
                            "isActive",
                            e.target.value === "true"
                          )
                        }
                        className="w-full text-gray-900 px-4 py-3 border h-11 outline-none text-sm border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      >
                        <option value="true" className="text-gray-900">
                          Active
                        </option>
                        <option value="false" className="text-gray-900">
                          Draft
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Pricing & Inventory
                </h2>
                <p className="text-xs text-gray-600 mb-6">
                  Set your product pricing and stock levels
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        handleInputChange("price", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full text-gray-900 px-4 outline-none text-sm h-11 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) =>
                        handleInputChange("quantity", e.target.value)
                      }
                      placeholder="0"
                      className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      SKU (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                      placeholder="e.g., RICE-5KG-001"
                      className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Leave blank to auto-generate
                    </p>
                  </div>
                </div>
              </div>

              {/* NEW: Discount Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Discount (Optional)
                </h2>
                <p className="text-xs text-gray-600 mb-6">
                  Set a discount for this product
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discountPercentage || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "discountPercentage",
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="w-full text-gray-900 px-4 outline-none text-sm h-11 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      0 = No discount
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Start Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.discountStartDate || ""}
                      onChange={(e) =>
                        handleInputChange("discountStartDate", e.target.value)
                      }
                      className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to start now
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.discountEndDate || ""}
                      onChange={(e) =>
                        handleInputChange("discountEndDate", e.target.value)
                      }
                      className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank for no expiry
                    </p>
                  </div>
                </div>

                {/* Discount Preview */}
                {formData.price && formData.discountPercentage > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-semibold">Original Price:</span>{" "}
                          {formatCurrency(formData.price)}
                        </p>
                        <p className="text-sm text-green-600 font-bold">
                          <span className="font-semibold">
                            Discounted Price:
                          </span>{" "}
                          {formatCurrency(
                            formData.price *
                              (1 - formData.discountPercentage / 100)
                          )}
                        </p>
                        {(formData.discountStartDate ||
                          formData.discountEndDate) && (
                          <p className="text-xs text-gray-600 mt-2">
                            {formData.discountStartDate &&
                              `Starts: ${new Date(
                                formData.discountStartDate
                              ).toLocaleString()}`}
                            {formData.discountStartDate &&
                              formData.discountEndDate &&
                              " | "}
                            {formData.discountEndDate &&
                              `Ends: ${new Date(
                                formData.discountEndDate
                              ).toLocaleString()}`}
                          </p>
                        )}
                      </div>
                      <div className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold">
                        {formData.discountPercentage}% OFF
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Images */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Product Images
                </h2>
                <p className="text-xs text-gray-600 mb-6">
                  Upload up to 5 images (max 5MB each)
                </p>

                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={typeof image === "string" ? image : URL.createObjectURL(image)}
                          alt="preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX size={16} />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-orange-400 transition-colors">
                  <FiUpload className="mx-auto text-gray-400 mb-4" size={35} />
                  <p className="text-gray-700 font-medium text-sm mb-2">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mb-6">
                    JPG, PNG, WEBP (max 5MB each)
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="modal-image-upload"
                    disabled={selectedImages.length >= 5}
                  />
                  <label
                    htmlFor="modal-image-upload"
                    className={`inline-block px-8 py-2.5 text-xs rounded-lg font-semibold cursor-pointer transition-colors ${
                      selectedImages.length >= 5
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    {selectedImages.length >= 5
                      ? "Max 5 images reached"
                      : "Choose Files"}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-8 py-2.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addProductLoading}
                  className={`px-8 py-2.5 text-xs rounded-lg font-medium text-white flex items-center gap-3 transition-all ${
                    addProductLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : isOffline
                      ? "bg-yellow-500 hover:bg-yellow-600 shadow-md"
                      : "bg-linear-to-r from-orange-500 to-green-600 hover:shadow-xl"
                  }`}
                >
                  {addProductLoading ? (
                    <>Adding...</>
                  ) : isOffline ? (
                    <>
                      <FiZap />
                      Save Offline Draft
                    </>
                  ) : (
                    <>
                      <FiPackage />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
