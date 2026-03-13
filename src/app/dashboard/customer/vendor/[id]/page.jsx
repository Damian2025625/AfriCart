"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiMapPin,
  FiStar,
  FiPackage,
  FiCheckCircle,
  FiArrowLeft,
  FiShoppingCart,
  FiHeart
} from "react-icons/fi";
import { AiOutlineMessage } from "react-icons/ai";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";

export default function VendorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id;

  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [togglingWishlist, setTogglingWishlist] = useState({});

  useEffect(() => {
    fetchVendorDetails();
    fetchWishlistStatus();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const response = await fetch(`/api/vendor/${vendorId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Vendor not found");
      }

      setVendor(data.vendor);
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      toast.error("Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  const handleTalkToVendor = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please login to chat with vendor");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/customer/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: vendor._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dashboard/customer/chat/${data.conversationId}`);
      } else {
        toast.error(data.message || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const fetchWishlistStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Create a Set of product IDs in wishlist
        const productIds = new Set(
          data.wishlist.map((item) => item.productId._id || item.productId)
        );
        setWishlistItems(productIds);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
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

      const response = await fetch("/api/customer/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${product.name} added to cart!`);
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        toast.error(data.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product._id]: false }));
    }
  };

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
        // Remove from wishlist
        const response = await fetch("/api/customer/wishlist", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        const wishlistItem = data.wishlist.find(
          (item) => (item.productId._id || item.productId) === productId
        );

        if (wishlistItem) {
          const deleteResponse = await fetch(
            `/api/customer/wishlist/${wishlistItem._id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const deleteData = await deleteResponse.json();

          if (deleteData.success) {
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
        const response = await fetch("/api/customer/wishlist/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success(`${productName} added to wishlist`);
          setWishlistItems((prev) => new Set(prev).add(productId));
        } else {
          toast.error(data.message || "Failed to add to wishlist");
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setTogglingWishlist((prev) => ({ ...prev, [productId]: false }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Vendor not found
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span className="text-xs font-medium">Back</span>
      </button>

      {/* Vendor Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 md:p-6 mb-6 flex flex-col md:flex-row gap-6 items-start md:items-center border border-gray-100 dark:border-gray-800">
        {/* Logo */}
        <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            {vendor.logoUrl ? (
              <Image src={vendor.logoUrl} alt={vendor.businessName} width={128} height={128} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">{vendor.businessName.charAt(0)}</span>
            )}
        </div>

        {/* Info */}
        <div className="flex-1 w-full relative">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      {vendor.businessName}
                  </h1>
                  <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                      <FiCheckCircle className="w-3 h-3" /> Verified
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{vendor.city}, {vendor.state}</span>
                  </div>
                  {vendor.createdAt && (
                      <span className="text-gray-400 dark:text-gray-500">
                          Joined {new Date(vendor.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                  )}
                </div>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-col gap-2 shrink-0 md:min-w-[140px]">
                <button
                  onClick={handleTalkToVendor}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-xs flex items-center justify-center gap-2"
                >
                  <AiOutlineMessage className="w-4 h-4" /> Talk to Vendor
                </button>
              </div>
          </div>

          {/* Description */}
          {vendor.description ? (
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl">
                {vendor.description}
              </p>
          ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-4">No description provided for this store.</p>
          )}

          {/* Stats */}
          <div className="flex gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center border border-yellow-100 dark:border-yellow-900/50">
                  <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{vendor.rating || "0.0"} <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">/ 5</span></div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{vendor.totalRatings || 0} reviews</div>
                </div>
              </div>

              <div className="w-px bg-gray-200 dark:bg-gray-700"></div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center border border-orange-100 dark:border-orange-900/50">
                  <FiPackage className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{products.length}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">products</div>
                </div>
              </div>
          </div>

        </div>
      </div>

      {/* Products Grid */}
      <div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Store Products</h2>
          </div>

           {products.length === 0 ? (
               <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiPackage className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No products yet</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">This vendor hasn't uploaded any products.</p>
               </div>
           ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {products.map((product) => {
                      const mainImage = product.images?.[0];
                      const hasActiveDiscount = (product.discountPercentage || 0) > 0;
                      const discountedPrice = hasActiveDiscount 
                        ? product.price * (1 - product.discountPercentage / 100) 
                        : product.price;

                      const isAdding = addingToCart[product._id];

                      return (
                        <div
                          key={product._id}
                          className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800 flex flex-col"
                        >
                          {/* Product Image */}
                          <div className="relative bg-neutral-100 dark:bg-gray-800">
                            <Link href={`/dashboard/customer/products/${product._id}`} className="block relative h-40 md:h-44">
                              {mainImage ? (
                                <img
                                  src={mainImage}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-tr-xl rounded-tl-xl hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
                                  <FiPackage className="text-gray-300 dark:text-gray-600 text-4xl" />
                                </div>
                              )}
                            </Link>

                            {hasActiveDiscount && (
                              <div className="absolute top-4 left-2.5 z-10">
                                <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">
                                  -{product.discountPercentage}% OFF
                                </span>
                              </div>
                            )}

                             <button
                                onClick={(e) => {
                                  e.preventDefault(); // Prevent link navigation
                                  handleToggleWishlist(product._id, product.name);
                                }}
                                disabled={togglingWishlist[product._id]}
                                className="absolute top-4 right-4 w-8 h-8 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed z-10"
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

                          {/* Product Info Section */}
                          <div className="p-3 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-900 dark:text-gray-300 font-semibold">
                                {product.category?.name || "Product"}
                              </span>
                            </div>

                            <Link href={`/dashboard/customer/products/${product._id}`}>
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 hover:text-orange-500 transition-colors cursor-pointer leading-snug">
                                {product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}
                              </h3>
                            </Link>

                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 line-clamp-1">
                                by {vendor?.businessName || "Local Vendor"}
                             </p>
                            
                            <div className="flex items-center gap-1 mb-2 text-gray-500 dark:text-gray-400">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-[10px]">
                                {vendor?.city || "Lagos"}
                              </span>
                            </div>

                              <div className="mb-2 flex items-center gap-2">
                                  {hasActiveDiscount ? (
                                    <>
                                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(discountedPrice)}
                                      </span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                        {formatCurrency(product.price)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(product.price)}
                                    </span>
                                  )}
                              </div>

                            <div className="flex items-end justify-between mt-auto">
                                <div className="flex gap-2 w-full">
                                   <button
                                      onClick={() => handleAddToCart(product)}
                                      disabled={isAdding}
                                      className={`flex-1 py-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 w-full ${
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
                                </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
           )}
        </div>
    </div>
  );
}
