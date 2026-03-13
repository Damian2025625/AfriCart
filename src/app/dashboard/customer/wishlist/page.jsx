"use client";

import React, { useState, useEffect } from "react";
import {
  FiHeart,
  FiShoppingCart,
  FiTrash2,
  FiPackage,
  FiStar,
  FiMapPin,
  FiEye,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [addingToCartIds, setAddingToCartIds] = useState(new Set());

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/customer/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setWishlist(data.wishlist || []);
      } else {
        toast.error(data.message || "Failed to load wishlist");
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId, productName) => {

    setRemovingIds((prev) => new Set(prev).add(wishlistId));

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`/api/customer/wishlist/${wishlistId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Removed from wishlist");
        setWishlist((prev) => prev.filter((item) => item._id !== wishlistId));
      } else {
        toast.error(data.message || "Failed to remove from wishlist");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    } finally {
      setRemovingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wishlistId);
        return newSet;
      });
    }
  };

  const handleAddToCart = async (product, wishlistId) => {
    setAddingToCartIds((prev) => new Set(prev).add(wishlistId));

    try {
      const token = localStorage.getItem("authToken");

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
        
        // Optionally remove from wishlist after adding to cart
        // await handleRemoveFromWishlist(wishlistId, product.name);
      } else {
        toast.error(data.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCartIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wishlistId);
        return newSet;
      });
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

  const toSentenceCase = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const isDiscountActive = (product) => {
    if (!product?.discountPercentage || product.discountPercentage === 0)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Wishlist</h1>
        <p className="text-gray-600 text-sm">
          {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
        </p>
      </div>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiHeart className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Save items you love to come back to them later
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-sm"
          >
            <FiPackage className="w-4 h-4" />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {wishlist.map((item) => {
            const product = item.productId;
            if (!product) return null;

            const mainImage = product.images?.[0];
            const hasActiveDiscount = isDiscountActive(product);
            const discountedPrice = getDiscountedPrice(product);
            const isRemoving = removingIds.has(item._id);
            const isAddingToCart = addingToCartIds.has(item._id);

            return (
              <div
                key={item._id}
                className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                {/* Product Image */}
                <div className="relative bg-linear-to-br from-orange-100 via-yellow-50 to-green-100">
                  <div className="relative h-48">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white">
                        <FiPackage className="text-gray-300 text-4xl" />
                      </div>
                    )}
                  </div>

                  {hasActiveDiscount && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">
                        -{product.discountPercentage}% OFF
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveFromWishlist(item._id, product.name)}
                    disabled={isRemoving}
                    className="absolute top-3 right-3 w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from wishlist"
                  >
                    {isRemoving ? (
                      <svg
                        className="animate-spin h-4 w-4 text-red-500"
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
                      <FiHeart className="text-red-500 text-lg fill-current" />
                    )}
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-900 font-semibold">
                      {product.categoryId?.name || "Uncategorized"}
                    </span>
                  </div>

                  <Link href={`/dashboard/customer/products/${product._id}`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 hover:text-orange-500 transition-colors cursor-pointer">
                      {toSentenceCase(product.name)}
                    </h3>
                  </Link>

                  <p className="text-[10px] text-gray-500 mb-2">
                    by {product.vendorId?.businessName || "Local Vendor"}
                  </p>

                  <div className="flex items-center gap-1 mb-3 text-gray-500">
                    <FiMapPin className="w-3 h-3" />
                    <span className="text-[10px]">
                      {product.vendorId?.city || "Lagos"}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    {hasActiveDiscount ? (
                      <>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(discountedPrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product, item._id)}
                      disabled={isAddingToCart}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        isAddingToCart
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-linear-to-r from-orange-500 to-green-500 text-white hover:shadow-lg hover:scale-[1.02]"
                      }`}
                    >
                      {isAddingToCart ? (
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
                          <FiShoppingCart className="w-3.5 h-3.5" />
                          Add to Cart
                        </>
                      )}
                    </button>

                    <Link
                      href={`/dashboard/customer/products/${product._id}`}
                      className="px-3 py-2 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-all flex items-center justify-center"
                      title="View Details"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {product.quantity < 10 && product.quantity > 0 && (
                    <p className="text-[10px] text-orange-600 font-semibold mt-2">
                      Only {product.quantity} left in stock!
                    </p>
                  )}

                  {product.quantity === 0 && (
                    <p className="text-[10px] text-red-600 font-semibold mt-2">
                      Out of stock
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}