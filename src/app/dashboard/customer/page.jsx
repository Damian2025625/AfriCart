"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiShoppingCart,
  FiHeart,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiArrowRight,
  FiEye,
  FiZap,
} from "react-icons/fi";
import { LuBookCopy, LuCoffee, LuSmartphone } from "react-icons/lu";
import { IoShirtOutline, IoSparklesOutline } from "react-icons/io5";
import { LuApple, LuHammer, LuPaintbrushVertical, LuCar } from "react-icons/lu";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";

export default function CustomerPage() {
  const router = useRouter();
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addingToCart, setAddingToCart] = useState({});
  const [productRatings, setProductRatings] = useState({});
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [togglingWishlist, setTogglingWishlist] = useState({});
  const hasInitialized = React.useRef(false);

  const featuredDeals = [
    {
      id: 1,
      title: "Farm Fresh Produce",
      subtitle:
        "Enjoy organically grown fruits and vegetables harvested directly from local farms. Fresh, healthy, and carefully delivered to your doorstep to support better living and sustainable agriculture.",
      badge: "Fresh Daily",
      badgeIcon: "🌿",
      buttonText: "Shop Fresh",
      buttonColor: "bg-white text-green-600 hover:bg-green-50",
      backgroundImage:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80",
      overlay: "bg-black/30",
    },
    {
      id: 2,
      title: "Artisan Crafts",
      subtitle:
        "Discover unique, handcrafted products made with care by skilled local artisans. Each item tells a story of creativity, culture, and quality craftsmanship you won't find anywhere else.",
      badge: "Handmade",
      badgeIcon: "✨",
      buttonText: "Discover",
      buttonColor: "bg-white text-green-600 hover:bg-green-50",
      backgroundImage:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=80",
      overlay: "bg-black/40",
    },
    {
      id: 3,
      title: "Latest Tech",
      subtitle:
        "Explore high-quality electronics and modern gadgets sourced from trusted local vendors. Stay up to date with reliable technology designed to improve your work, lifestyle, and everyday convenience.",
      badge: "New Arrivals",
      badgeIcon: "⚡",
      buttonText: "Explore",
      buttonColor: "bg-white text-green-600 hover:bg-green-50",
      backgroundImage:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80",
      overlay: "bg-black/50",
    },
  ];

  useEffect(() => {
    if (hasInitialized.current) return; // Prevent React Strict Mode double-fire
    hasInitialized.current = true;
    fetchData();
    fetchWishlistStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredDeals.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredDeals.length]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [categoriesRes, productsRes] = await Promise.all([
        axios.get("/api/categories"),
        axios.get("/api/products/featured?limit=20", config)
      ]);

      if (categoriesRes.data.success) {
        setCategories((categoriesRes.data.categories || []).slice(0, 8));
      }
      
      const products = productsRes.data.success ? (productsRes.data.products || []) : [];
      setFeaturedProducts(products);
      
      setCategoriesLoading(false);
      setProductsLoading(false);

      // ── Step 2: Ratings load in background (non-blocking) ──
      if (products.length > 0) {
        const productIds = products.map((p) => p._id);
        axios.post("/api/products/ratings", { productIds })
          .then((res) => {
            if (res.data.success) {
              setProductRatings((prev) => ({ ...prev, ...res.data.ratings }));
            }
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
      setCategoriesLoading(false);
      setProductsLoading(false);
    }
  };

  const fetchWishlistStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await axios.get("/api/customer/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Create a Set of product IDs in wishlist
        const productIds = new Set(
          response.data.wishlist.map((item) => item.productId._id || item.productId)
        );
        setWishlistItems(productIds);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  // Add this function to toggle wishlist
  const handleToggleWishlist = async (productId, productName) => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast.error("Please login to add to wishlist");
      window.location.href = "/login";
      return;
    }

    setTogglingWishlist((prev) => ({ ...prev, [productId]: true }));

    try {
      const isInWishlist = wishlistItems.has(productId);

      if (isInWishlist) {
        // Remove from wishlist - first get wishlist to find the item ID
        const response = await axios.get("/api/customer/wishlist", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const wishlistItem = response.data.wishlist.find(
          (item) => (item.productId._id || item.productId) === productId
        );

        if (wishlistItem) {
          const deleteResponse = await axios.delete(
            `/api/customer/wishlist/${wishlistItem._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (deleteResponse.data.success) {
            toast.success("Removed from wishlist");
            setWishlistItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(productId);
              return newSet;
            });
          }
        }
      } else {
        // Add to wishlist
        const response = await axios.post(
          "/api/customer/wishlist/add",
          { productId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          toast.success(`${productName} added to wishlist`);
          setWishlistItems((prev) => new Set(prev).add(productId));
        } else {
          toast.error(response.data.message || "Failed to add to wishlist");
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setTogglingWishlist((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/dashboard/customer/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredDeals.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + featuredDeals.length) % featuredDeals.length
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toSentenceCase = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleAddToCart = async (product) => {
    setAddingToCart((prev) => ({ ...prev, [product._id]: true }));
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please login to add items to cart");
        setAddingToCart((prev) => ({ ...prev, [product._id]: false }));
        window.location.href = "/login";
        return;
      }

      const response = await axios.post(
        "/api/customer/cart/add",
        {
          productId: product._id,
          quantity: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success(`${product.name} added to cart!`);
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        toast.error(response.data.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product._id]: false }));
    }
  };

  const isDiscountActive = (product) => {
    if (!product.discountPercentage || product.discountPercentage === 0)
      return false;

    const now = new Date();
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    return (!startDate || now >= startDate) && (!endDate || now <= endDate);
  };

  const getDiscountedPrice = (product) => {
    if (isDiscountActive(product)) {
      return product.price * (1 - product.discountPercentage / 100);
    }
    return product.price;
  };

  const currentDeal = featuredDeals[currentSlide];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-125 md:h-125 w-full rounded-2xl md:rounded-3xl overflow-hidden mb-12 group">
        {featuredDeals.map((deal, index) => (
          <div
            key={deal.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Image
              src={deal.backgroundImage}
              alt={deal.title}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
            <div className={`absolute inset-0 ${deal.overlay}`}></div>
          </div>
        ))}

        <div className="relative h-full flex flex-col justify-between p-6 md:p-8 lg:p-12 z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-3 sm:mb-4 md:mb-6">
              <span className="text-xs">{currentDeal.badgeIcon}</span>
              <span className="text-white text-xs font-semibold">
                {currentDeal.badge}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-3 leading-tight">
              {currentDeal.title}
            </h1>

            <p className="text-xs md:text-base text-white/90 mb-4 sm:mb-6 max-w-xl">
              {currentDeal.subtitle}
            </p>

            <button
              className={`inline-flex items-center gap-2 px-5 sm:px-6 md:px-8 text-xs py-2.5 sm:py-3 ${currentDeal.buttonColor} rounded-lg md:rounded-xl font-bold shadow-xl transition-all duration-300 hover:scale-105`}
            >
              {currentDeal.buttonText}
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full max-w-3xl mt-4">
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-white rounded-lg md:rounded-xl shadow-2xl overflow-hidden">
                <div className="hidden sm:flex items-center pl-4 md:pl-6 text-gray-400">
                  <FiSearch className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 sm:px-5 py-2 sm:py-2.5 mr-1 sm:mr-1.5 bg-orange-500 text-white font-semibold rounded-md sm:rounded-lg text-[11px] sm:text-xs hover:bg-orange-600 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FiSearch className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <button
          onClick={prevSlide}
          className="hidden md:flex absolute left-4 lg:left-6 top-1/2 transform -translate-y-1/2 p-2.5 lg:p-3 bg-white/25 backdrop-blur-sm rounded-full text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100 items-center justify-center z-10"
        >
          <FiChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="hidden md:flex absolute right-4 lg:right-6 top-1/2 transform -translate-y-1/2 p-2.5 lg:p-3 bg-white/25 backdrop-blur-sm rounded-full text-white hover:bg-white/35 transition-all opacity-0 group-hover:opacity-100 items-center justify-center z-10"
        >
          <FiChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
        </button>

        <button
          onClick={prevSlide}
          className="md:hidden absolute left-2 top-3/5 transform -translate-y-3/5 p-2 bg-white/30 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-all flex items-center justify-center z-10"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="md:hidden absolute right-2 top-3/5 transform -translate-y-3/5 p-2 bg-white/30 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-all flex items-center justify-center z-10"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-20 md:bottom-28 lg:bottom-32 left-7 md:left-8 lg:left-12 flex gap-1.5 sm:gap-2 z-10">
          {featuredDeals.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 sm:w-10 bg-white"
                  : "w-1.5 sm:w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Shop by Category
          </h2>
          <Link
            href="/dashboard/customer/categories"
            className="text-orange-500 hover:text-orange-600 font-semibold text-xs md:text-sm flex items-center gap-1 md:gap-2"
          >
            View All
            <FiArrowRight className="w-3 h-3 md:w-4 md:h-4" />
          </Link>
        </div>
 
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => {
            const categoryStyles = [
              {
                gradient: "from-green-600/80 to-green-800/80",
                bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
                icon: <LuApple className="text-sm text-white" />,
              },
              {
                gradient: "from-purple-600/80 to-purple-800/80",
                bg: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                icon: <LuPaintbrushVertical className="text-sm text-white" />,
              },
              {
                gradient: "from-gray-700/80 to-gray-900/80",
                bg: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
                icon: <LuCar className="text-sm text-white" />,
              },
              {
                gradient: "from-orange-600/80 to-orange-800/80",
                bg: "https://images.unsplash.com/photo-1763987300719-fd27c51a3227?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                icon: <IoSparklesOutline className="text-sm text-white" />,
              },
              {
                gradient: "from-purple-500/80 to-pink-600/80",
                bg: "https://images.unsplash.com/photo-1581462700959-99ee74a9bc6d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                icon: <LuBookCopy className="text-sm text-white" />,
              },
              {
                gradient: "from-teal-600/80 to-cyan-700/80",
                bg: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
                icon: <LuSmartphone className="text-sm text-white" />,
              },
              {
                gradient: "from-pink-600/80 to-red-700/80",
                bg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
                icon: <IoShirtOutline className="text-sm text-white" />,
              },
              {
                gradient: "from-blue-500/80 to-blue-700/80",
                bg: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
                icon: <LuCoffee className="text-sm text-white" />,
              },
            ];

            const style = categoryStyles[index % categoryStyles.length];

            return (
              <Link
                key={category._id}
                href={`/dashboard/customer/categories/${category._id}`}
                className="group relative h-40 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="absolute inset-0">
                  <img
                    src={style.bg}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${style.gradient}`}
                  ></div>
                </div>

                <div className="relative h-full flex flex-col justify-between p-4">
                  <div className="self-end">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl md:text-2xl">
                      {style.icon}
                    </div>
                  </div>

                  <div className="text-white">
                    <h3 className="text-base font-bold mb-1">
                      {category.name}
                    </h3>
                    <p className="text-xs text-white/90 flex items-center gap-1">
                      <span>{category.product_count || 0}+ products</span>
                      <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>

      {/* Featured Products */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Featured Products
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              Handpicked just for you
            </p>
          </div>
          <Link
            href="/shop"
            className="text-orange-500 hover:text-orange-600 font-semibold text-xs md:text-sm flex items-center gap-1 md:gap-2"
          >
            View All
            <FiArrowRight className="w-3 h-3 md:w-4 md:h-4" />
          </Link>
        </div>
 
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Real product cards — already fetched */}
          {featuredProducts.map((product, index) => {
            const mainImage = product.images?.[0];
            const hasActiveDiscount = isDiscountActive(product);
            const discountedPrice = getDiscountedPrice(product);
            const isAdding = addingToCart[product._id];
            // Prioritize embedded rating data from the API, fallback to background state
            const rData = product.productRating || productRatings[product._id];
            const hasRatings = rData && (rData.count > 0 || rData.totalRatings > 0);
            const averageRating = rData ? (rData.average || rData.rating || 0) : 0;
            const reviewCount = rData ? (rData.count || rData.totalRatings || 0) : 0;

            const badges = [];

            const isNew = product.createdAt && (new Date() - new Date(product.createdAt)) < 7 * 24 * 60 * 60 * 1000;
            const isBestSeller = (product.totalSold || 0) >= 10;
            const isTopRated = hasRatings && averageRating >= 4.5 && reviewCount >= 3;

            if (isBestSeller) {
              badges.push({ text: "🔥 Best Seller", color: "bg-gradient-to-r from-orange-500 to-yellow-500" });
            } else if (isTopRated) {
              badges.push({ text: "⭐ Top Rated", color: "bg-purple-500" });
            } else if (isNew) {
              badges.push({ text: "✨ New Arrival", color: "bg-green-500" });
            }

            if (product.activeSlashId) {
              badges.push({ text: "🔥 Group Buy", color: "bg-linear-to-r from-orange-500 to-red-500 animate-pulse" });
            }
            if (product.hasActivePowerHour) {
              badges.push({ text: "⚡ Power Hour", color: "bg-linear-to-r from-blue-500 to-indigo-600" });
            }
            if (product.hasAcceptedOffer) {
              badges.push({ text: "✅ Offer Accepted", color: "bg-linear-to-r from-green-500 to-emerald-600 shadow-green-100" });
            }

            return (
              <div
                key={product._id}
                className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800"
              >
                {/* Product Image */}
                <div className="relative bg-neutral-100 dark:bg-gray-800">
                  <div className="relative h-44">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-tr-xl rounded-tl-xl"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <FiPackage className="text-gray-300 dark:text-gray-600 text-4xl" />
                      </div>
                    )}
                  </div>

                  {(hasActiveDiscount || badges.length > 0) && (
                    <div className="absolute top-4 left-2.5 flex flex-col gap-1">
                      {hasActiveDiscount && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">
                          -{product.discountPercentage}% OFF
                        </span>
                      )}
                      {badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`${badge.color} text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-md`}
                        >
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.preventDefault(); // Prevent link navigation
                      handleToggleWishlist(product._id, product.name);
                    }}
                    disabled={togglingWishlist[product._id]}
                    className="absolute top-4 right-4 w-8 h-8 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      wishlistItems.has(product._id)
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                  >
                    {togglingWishlist[product._id] ? (
                      <svg
                        className="animate-spin h-4 w-4 text-orange-500"
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
                    ) : (
                      <FiHeart
                        className={`text-base outline-none ${
                          wishlistItems.has(product._id)
                            ? "text-red-500 fill-current"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      />
                    )}
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-900 dark:text-gray-300 font-semibold">
                      {product.category?.name || "Uncategorized"}
                    </span>
                  </div>

                  <Link href={`/dashboard/customer/products/${product._id}`}>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 hover:text-orange-500 transition-colors cursor-pointer">
                      {toSentenceCase(product.name)}
                    </h3>
                  </Link>

                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                    by {product.vendor?.businessName || "Local Vendor"}
                  </p>

                  <div className="flex items-center gap-1 mb-2 text-gray-500 dark:text-gray-400">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-[10px]">
                      {product.vendor?.city || "Lagos"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    {hasRatings ? (
                      <>
                        <FiStar className="text-yellow-400 text-xs fill-current" />
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {averageRating.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400">
                          ({reviewCount}{" "}
                          {reviewCount === 1 ? "review" : "reviews"})
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] text-gray-400 italic">
                        No reviews yet
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm md:text-base font-black text-gray-900 dark:text-white">
                      {formatCurrency(product.hasAcceptedOffer ? product.exclusivePrice : discountedPrice)}
                    </span>
                    {(hasActiveDiscount || product.hasAcceptedOffer) && (
                      <span className="text-[10px] md:text-xs text-gray-400 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isAdding}
                      className={`flex-1 py-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        isAdding
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-linear-to-r from-orange-500 to-green-500 text-white hover:shadow-lg hover:scale-[1.02]"
                      }`}
                    >
                      {isAdding ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
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
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <FiShoppingCart className="w-3 h-3" />
                          Add to Cart
                        </>
                      )}
                    </button>

                    <Link
                      href={`/dashboard/customer/products/${product._id}`}
                      className="px-2.5 py-2 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-all flex items-center justify-center"
                      title="View Details"
                    >
                      <FiEye className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Skeleton cards for slots still being fetched */}
          {Array.from({ length: Math.max(0, 20 - featuredProducts.length) }).map((_, i) => (
            <div key={`skeleton-${i}`} className="h-72 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
