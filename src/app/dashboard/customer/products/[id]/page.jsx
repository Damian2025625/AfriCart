"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiHeart,
  FiShare2,
  FiStar,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTruck,
  FiShield,
  FiRefreshCw,
  FiPackage,
  FiMapPin,
  FiCheckCircle,
  FiArrowLeft,
  FiThumbsUp,
  FiThumbsDown,
  FiTag,
  FiDollarSign,
  FiZap,
  FiUsers,
  FiClock
} from "react-icons/fi";
import { AiOutlineMessage } from "react-icons/ai";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProductDescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [addingToCart, setAddingToCart] = useState(false);
  const [editingReview, setEditingReview] = useState(null); // Stores the review being edited
  const [userExistingReview, setUserExistingReview] = useState(null); // Stores user's existing review

  // Cart states
  const [cartItemQuantity, setCartItemQuantity] = useState(null);
  const [checkingCart, setCheckingCart] = useState(false);

  // Rating states
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Custom price state
  const [customPrice, setCustomPrice] = useState(null);

  //Wishlist state
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  // Make an Offer Modal States
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [existingOffer, setExistingOffer] = useState(null);

  // Community Slash states
  const [slashSession, setSlashSession] = useState(null);
  const [joiningSlash, setJoiningSlash] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState("");


  const fetchCustomPrice = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `/api/customer/products/${productId}/custom-price`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.customPrice) {
        setCustomPrice(data.customPrice);
      }
    } catch (error) {
      console.error("Error fetching custom price:", error);
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
          vendorId: product.vendor._id,
          productId: productId,
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

  const checkWishlistStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `/api/customer/wishlist/check?productId=${productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setInWishlist(data.inWishlist);
        setWishlistId(data.wishlistId);
      }
    } catch (error) {
      console.error("Error checking wishlist:", error);
    }
  };

  // Add this function to toggle wishlist
  const handleToggleWishlist = async () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast.error("Please login to add to wishlist");
      router.push("/login");
      return;
    }

    setTogglingWishlist(true);

    try {
      if (inWishlist) {
        // Remove from wishlist
        const response = await fetch(`/api/customer/wishlist/${wishlistId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Removed from wishlist");
          setInWishlist(false);
          setWishlistId(null);
        } else {
          toast.error(data.message || "Failed to remove from wishlist");
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
          toast.success(`${product.name} added to wishlist`);
          setInWishlist(true);
          setWishlistId(data.wishlistItem._id);
        } else if (data.alreadyExists) {
          toast.error("Product already in wishlist");
          setInWishlist(true);
        } else {
          toast.error(data.message || "Failed to add to wishlist");
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setTogglingWishlist(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchCurrentUser();
      await fetchProductDetails();
      await fetchReviews(); // ✅ Moved here, after currentUser is fetched
      await checkCartStatus();
      await fetchCustomPrice();
      await checkWishlistStatus();
      await checkExistingOffer();
      await fetchSlashStatus();
    };

    initialize();
  }, [productId]);

  const fetchSlashStatus = async () => {
    try {
      const response = await fetch(`/api/customer/promotion/slash/status/${productId}`);
      const data = await response.json();
      if (data.success) {
        setSlashSession(data.session);
      }
    } catch (error) {
      console.error("Error fetching slash status:", error);
    }
  };

  const handleJoinSlash = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Please login to join the group buy");
      router.push("/login");
      return;
    }

    if (!slashSession) return;

    setJoiningSlash(true);
    try {
      const response = await fetch("/api/customer/promotion/slash/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slashId: slashSession.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        await fetchSlashStatus();
      } else {
        toast.error(data.message || "Failed to join group buy");
      }
    } catch (error) {
      console.error("Error joining slash:", error);
      toast.error("Failed to join group buy");
    } finally {
      setJoiningSlash(false);
    }
  };

  // ✅ Add this new useEffect to refetch reviews when currentUser changes
  useEffect(() => {
    if (currentUser && reviews.length > 0) {
      checkUserExistingReview();
    }
  }, [currentUser, reviews]);

  useEffect(() => {
    const handleCartUpdate = () => {
      checkCartStatus();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [productId]);

  const isOfferActive = (existingOffer?.status === 'ACCEPTED' || existingOffer?.status === 'CLAIMED') && new Date(existingOffer.expiresAt) > new Date();

  // Countdown Timer Effect
  useEffect(() => {
    if (!existingOffer?.expiresAt || !isOfferActive) {
      setTimeLeft("");
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(existingOffer.expiresAt).getTime() - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        clearInterval(timer);
        // Refresh offer status to hide UI
        checkExistingOffer();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      timeString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setTimeLeft(timeString);
    }, 1000);

    return () => clearInterval(timer);
  }, [existingOffer, isOfferActive]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setCurrentUser(null);
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
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const checkExistingOffer = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `/api/customer/offers?productId=${params.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success && data.offers.length > 0) {
        console.log(`[OfferCheck] Found ${data.offers.length} offers for product ${params.id}`);
        // Filter out expired offers
        const activeOffers = data.offers.filter(o => new Date(o.expiresAt) > new Date());
        
        if (activeOffers.length > 0) {
          // Find the most relevant offer (Accepted first, then Claimed, then Pending)
          const sortedOffers = activeOffers.sort((a, b) => {
            const statusPriority = { 'ACCEPTED': 0, 'CLAIMED': 1, 'PENDING': 2 };
            const priorityA = statusPriority[a.status] ?? 3;
            const priorityB = statusPriority[b.status] ?? 3;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          console.log(`[OfferCheck] Selected offer status: ${sortedOffers[0].status}`);
          setExistingOffer(sortedOffers[0]);
        } else {
          console.log(`[OfferCheck] All offers found are expired.`);
          setExistingOffer(null);
        }
      }
    } catch (error) {
      console.error("Error checking existing offer:", error);
    }
  };

  const handleMakeOffer = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Please login to make an offer");
      router.push("/login");
      return;
    }

    if (!minPrice || !maxPrice) {
      toast.error("Please enter both minimum and maximum price");
      return;
    }

    if (parseFloat(minPrice) <= 0 || parseFloat(maxPrice) <= 0) {
      toast.error("Prices must be greater than 0");
      return;
    }

    if (parseFloat(maxPrice) <= parseFloat(minPrice)) {
      toast.error("Maximum price must be greater than minimum price");
      return;
    }

    if (parseFloat(minPrice) > product.price) {
      toast.error("Your minimum offer cannot exceed the product price");
      return;
    }

    setSubmittingOffer(true);

    try {
      const response = await fetch("/api/customer/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product._id,
          minPrice: parseFloat(minPrice),
          maxPrice: parseFloat(maxPrice),
          customerNote: customerNote.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Your offer has been submitted to the vendor!");
        setShowOfferModal(false);
        setMinPrice("");
        setMaxPrice("");
        setCustomerNote("");
        setExistingOffer(data.offer);
      } else {
        toast.error(data.message || "Failed to submit offer");
      }
    } catch (error) {
      console.error("Error submitting offer:", error);
      toast.error("Failed to submit offer");
    } finally {
      setSubmittingOffer(false);
    }
  };


  const checkCartStatus = async () => {
    try {
      setCheckingCart(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setCartItemQuantity(null);
        return;
      }

      const response = await fetch(
        `/api/customer/cart/check?productId=${productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setCartItemQuantity(data.quantity);
      } else {
        setCartItemQuantity(null);
      }
    } catch (error) {
      console.error("Error checking cart status:", error);
      setCartItemQuantity(null);
    } finally {
      setCheckingCart(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Product not found");
      }

      setProduct(data.product);

      // Fetch related products
      if (data.product.categoryId) {
        const relatedResponse = await fetch(
          `/api/products/related?categoryId=${data.product.categoryId}&excludeId=${productId}&limit=4`
        );
        const relatedData = await relatedResponse.json();

        if (relatedData.success) {
          setRelatedProducts(relatedData.products || []);
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkUserExistingReview = async () => {
    if (!currentUser) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      // Get customer profile
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) return;

      // Find user's review in the reviews list
      const existingReview = reviews.find((review) => {
        // Compare using customer name (since we don't have customerId easily accessible)
        return (
          review.customer?.firstName === currentUser.firstName &&
          review.customer?.lastName === currentUser.lastName
        );
      });

      if (existingReview) {
        console.log("Found existing review:", existingReview);
        setUserExistingReview(existingReview);
        setUserRating(existingReview.rating);
        setReviewText(existingReview.comment);
      }
    } catch (error) {
      console.error("Error checking user review:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 10) {
      toast.error("Please write a review (minimum 10 characters)");
      return;
    }

    setSubmittingReview(true);

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please login to leave a review");
        router.push("/login");
        return;
      }

      // ✅ Check if editing existing review
      if (userExistingReview) {
        // Edit existing review
        const response = await fetch(
          `/api/products/${productId}/reviews/${userExistingReview._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              rating: userRating,
              comment: reviewText.trim(),
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          toast.success("Review updated successfully!");
          setUserExistingReview(data.review);
          await fetchReviews();
          await fetchProductDetails();
        } else {
          toast.error(data.message || "Failed to update review");
        }
      } else {
        // Create new review
        const response = await fetch(`/api/products/${productId}/reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: userRating,
            comment: reviewText.trim(),
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Review submitted successfully!");
          setUserExistingReview(data.review);
          await fetchReviews();
          await fetchProductDetails();
        } else {
          toast.error(data.message || "Failed to submit review");
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!confirm("Are you sure you want to delete your review?")) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `/api/products/${productId}/reviews/${userExistingReview._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Review deleted successfully!");
        setUserExistingReview(null);
        setUserRating(0);
        setReviewText("");
        await fetchReviews();
        await fetchProductDetails();
      } else {
        toast.error(data.message || "Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      distribution[review.rating]++;
    });
    return distribution;
  };

  const handleClaimOffer = async () => {
    if (!existingOffer || existingOffer.status !== 'ACCEPTED') {
      // If already claimed, just add to cart
      await handleAddToCart();
      return;
    }
    
    setAddingToCart(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch('/api/customer/offers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          offerId: existingOffer._id,
          action: 'CLAIM_OFFER'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setExistingOffer(data.offer);
        // Add to cart with the new status
        await handleAddToCart();
      } else {
        // Fallback to just adding to cart
        await handleAddToCart();
      }
    } catch (error) {
      console.error('Error claiming offer:', error);
      await handleAddToCart();
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please login to add items to cart");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/customer/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: productId,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${product.name} added to cart!`);
        await checkCartStatus();
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        toast.error(data.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Product not found
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

  const hasActiveDiscount = isDiscountActive(product);
  const discountedPrice = getDiscountedPrice(product);
  
  const finalDisplayPrice = isOfferActive ? (existingOffer.finalPrice || existingOffer.maxPrice) : discountedPrice;
  const savings = product.price - finalDisplayPrice;
  
  const averageRating = calculateAverageRating();
  const ratingDistribution = getRatingDistribution();

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span className="text-xs font-medium">Back</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Images */}
          <div>
            <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPackage className="text-gray-300 text-5xl" />
                </div>
              )}

              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {hasActiveDiscount && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                    -{product.discountPercentage}% OFF
                  </span>
                )}
                <span className="bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <FiStar className="w-2.5 h-2.5" />
                  Featured
                </span>
                {product.hasActivePowerHour && (
                  <span className="bg-linear-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <FiZap className="w-2.5 h-2.5" />
                    Power Hour
                  </span>
                )}
                {product.activeSlashId && (
                  <span className="bg-linear-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                    <FiUsers className="w-2.5 h-2.5" />
                    Group Buy
                  </span>
                )}
              </div>

              <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                <button
                  onClick={handleToggleWishlist}
                  disabled={togglingWishlist}
                  className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    inWishlist ? "Remove from wishlist" : "Add to wishlist"
                  }
                >
                  {togglingWishlist ? (
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
                      className={`w-4 h-4 ${
                        inWishlist
                          ? "text-red-500 fill-current"
                          : "text-gray-700"
                      }`}
                    />
                  )}
                </button>
                <button className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-md">
                  <FiShare2 className="text-gray-700 w-4 h-4" />
                </button>
              </div>
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-orange-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            {slashSession && (
              <div className="mb-4 bg-linear-to-r from-orange-500 to-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiZap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Active Group Buy!</span>
                </div>
                <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-lg border border-white/30 truncate max-w-40">
                  {slashSession.currentCount} / {slashSession.targetCount} joined
                </span>
              </div>
            )}

            <div className="inline-block bg-orange-100 text-orange-600 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-2">
              {product.category?.name || "Product"}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <FiStar
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(averageRating)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-900">
                  {averageRating}
                </span>
                <span className="text-xs text-gray-500">
                  ({reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
              {product.totalSold > 0 && (
                <>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500">
                    {product.totalSold.toLocaleString()} sold
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <FiCheckCircle className="text-green-500 w-4 h-4" />
              <span className="text-green-600 font-semibold text-xs">
                In Stock ({product.quantity} left)
              </span>
            </div>

            {/* Custom Price Section */}
            {customPrice ? (
              <div className="bg-linear-to-r from-green-50 to-green-100 rounded-lg p-3 mb-4 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-600 w-5 h-5" />
                  <span className="text-xs font-bold text-green-800">
                    Special Price For You!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-green-600">
                    {formatCurrency(customPrice.customPrice)}
                  </span>
                  <span className="text-base text-gray-400 line-through">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Save{" "}
                    {formatCurrency(product.price - customPrice.customPrice)}
                  </span>
                </div>
                {customPrice.expiresAt && (
                  <p className="text-xs text-green-700 mt-2">
                    ⏰ Offer expires:{" "}
                    {new Date(customPrice.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <>
                {isOfferActive && (
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                      <FiStar className="fill-current w-2.5 h-2.5" />
                      Special Offer for You
                    </p>
                    {timeLeft && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100/50 rounded-full border border-green-200">
                        <FiClock className="w-2.5 h-2.5 text-green-600" />
                        <span className="text-[10px] font-mono font-bold text-green-700">{timeLeft}</span>
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`rounded-xl p-3 mb-4 ${
                    isOfferActive ? "bg-green-50" : "bg-orange-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl md:text-3xl font-black ${
                        isOfferActive ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {formatCurrency(finalDisplayPrice)}
                    </span>
                    {(hasActiveDiscount || isOfferActive) && (
                      <>
                        <span className="text-base text-gray-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                        <span
                          className={`${
                            isOfferActive ? "bg-green-500" : "bg-red-500"
                          } text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`}
                        >
                          Save {formatCurrency(savings)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}


            {/* Community Slashing Promotion Card */}
            {product.activeSlashId && slashSession && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-6 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500 rounded-lg text-white">
                        <FiUsers size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Community Slashing</h3>
                        <p className="text-[10px] text-orange-700 font-medium">Join friends to slash the price!</p>
                      </div>
                    </div>
                    {slashSession.status === 'PENDING' && (
                      <div className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-200 flex items-center gap-1">
                        <FiClock size={12} />
                        {Math.max(0, Math.floor((new Date(slashSession.endTime) - new Date()) / (1000 * 60 * 60)))}h left
                      </div>
                    )}
                    {slashSession.status === 'SUCCESS' && (
                      <div className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-200 flex items-center gap-1">
                        <FiCheckCircle size={12} />
                        Target Reached!
                      </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Slashed Price</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-orange-600">{formatCurrency(slashSession.slashedPrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatCurrency(slashSession.originalPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Participants</p>
                      <span className="text-sm font-bold text-gray-900">{slashSession.currentCount} / {slashSession.targetCount}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-200 rounded-full mb-4 overflow-hidden border border-gray-100">
                    <div 
                      className="h-full bg-linear-to-r from-orange-400 to-orange-600 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (slashSession.currentCount / slashSession.targetCount) * 100)}%` }}
                    />
                  </div>

                  {slashSession.status === 'PENDING' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={handleJoinSlash}
                        disabled={joiningSlash || slashSession.participants.includes(currentUser?._id)}
                        className="py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                      >
                       {joiningSlash ? (
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                       ) : slashSession.participants.includes(currentUser?._id) ? (
                         <>
                           <FiCheckCircle />
                           Joined
                         </>
                       ) : (
                         <>
                           <FiPlus />
                           Join to Slash
                         </>
                       )}
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied! Share it with friends.");
                        }}
                        className="py-2.5 bg-white text-gray-900 border border-gray-200 rounded-xl text-xs font-bold hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
                      >
                        <FiShare2 />
                        Recruit Friends
                      </button>
                    </div>
                  ) : slashSession.status === 'SUCCESS' ? (
                    <div className="bg-green-100 border border-green-200 rounded-xl p-3">
                      <p className="text-[11px] text-green-800 font-medium leading-relaxed">
                        🎉 <span className="font-bold text-green-900">Level Unlocked!</span> {slashSession.participants.includes(currentUser?._id) 
                        ? "Since you were part of the group, you can now purchase at the slashed price." 
                        : "The community reached the target! You missed the join window, but keep an eye out for the next one."}
                      </p>
                    </div>
                  ) : null}
                </div>
                <FiZap className="absolute -right-4 -bottom-4 text-6xl text-orange-200/30 rotate-12" />
              </div>
            )}

            {/* Show banner ONLY if NOT in cart and NOT already claimed/completed */}
            {existingOffer && (cartItemQuantity === null) && !['CLAIMED', 'COMPLETED'].includes(existingOffer.status) && (
              <div className={`rounded-2xl p-5 mb-6 relative overflow-hidden border-2 transition-all duration-500 ${
                existingOffer.status === 'ACCEPTED' 
                  ? 'bg-linear-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl shadow-green-100 ring-2 ring-green-100' 
                  : 'bg-purple-50 border-purple-200 shadow-sm'
              }`}>
                {existingOffer.status === 'ACCEPTED' ? (
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-md">
                          <FiCheckCircle size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-green-900 text-sm">Special Offer Unlocked!</h3>
                          <p className="text-[10px] text-green-700 font-medium uppercase tracking-wider">Exclusive price just for you</p>
                        </div>
                      </div>
                      <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                        ACCEPTED
                      </div>
                    </div>

                    {timeLeft && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 mb-4 border border-green-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-green-600" size={14} />
                          <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest">Offer Expires In:</span>
                        </div>
                        <span className="text-sm font-mono font-black text-green-700">{timeLeft}</span>
                      </div>
                    )}

                    <div className="flex items-end gap-3 mb-4">
                      <div>
                        <p className="text-[9px] text-green-600 font-bold uppercase mb-0.5">Your New Price</p>
                        <span className="text-3xl font-black text-green-700">{formatCurrency(existingOffer.finalPrice || existingOffer.maxPrice)}</span>
                      </div>
                      <div className="mb-1">
                        <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleClaimOffer()} 
                      disabled={addingToCart}
                      className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
                    >
                      {addingToCart ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <FiShoppingCart />
                          Claim Special Offer
                        </>
                      )}
                    </button>
                    
                    <p className="text-center mt-3 text-[10px] text-green-600 font-medium italic">
                      "Enjoy this special discount on us!" — Vendor
                    </p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <FiTag size={16} />
                      </div>
                      <h3 className="font-bold text-purple-900 text-sm">Active Offer Sent</h3>
                    </div>
                    <p className="text-xs text-purple-800 mb-4">
                      Your offer of <span className="font-bold">{formatCurrency(existingOffer.minPrice)} - {formatCurrency(existingOffer.maxPrice)}</span> is currently being reviewed by the vendor.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-bold">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                      Waiting for vendor response
                    </div>
                  </div>
                )}
                {existingOffer.status === 'ACCEPTED' && (
                  <FiPackage className="absolute -right-6 -bottom-6 text-7xl text-green-600/10 rotate-12" />
                )}
              </div>
            )}

            {/* Vendor Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex flex-col gap-3 items-center justify-between">
                <div className="flex items-center gap-2.5 w-full">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {product.vendor?.businessName?.charAt(0) || "V"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {product.vendor?.businessName}
                      </h3>
                      <span className="bg-green-100 text-green-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <FiCheckCircle className="w-2.5 h-2.5" />
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <FiStar className="text-yellow-400 fill-current w-3 h-3" />
                      <span>{product.vendor?.rating || "0.0"}</span>
                      <span>|</span>
                      <span>
                        {product.vendor?.totalRatings || 0}{" "}
                        {product.vendor?.totalRatings === 1
                          ? "review"
                          : "reviews"}
                      </span>
                      <span>|</span>
                      <FiMapPin className="w-3 h-3" />
                      <span>
                        {product.vendor?.city}, {product.vendor?.state}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <Link 
                    href={`/dashboard/customer/vendor/${product.vendor?._id}`}
                    className="px-3 py-1.5 border border-orange-500 text-orange-500 w-full rounded-lg hover:bg-orange-50 transition-colors text-[12px] font-semibold flex items-center justify-center gap-1.5"
                  >
                    <FiPackage className="w-3 h-3" />
                    <span>Visit Shop</span>
                  </Link>
                  <button
                    onClick={handleTalkToVendor}
                    className="px-3 py-1.5 border border-orange-500 text-orange-500 w-full rounded-lg hover:bg-orange-50 transition-colors text-[12px] font-semibold flex items-center justify-center gap-1.5"
                  >
                    <AiOutlineMessage className="w-3 h-3" />
                    <span>Talk to Vendor</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 w-full">
              <button
                  onClick={() => setShowOfferModal(true)}
                  disabled={!!existingOffer}
                  className={`px-3 py-2 border text-[12px] rounded-lg font-semibold w-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    existingOffer?.status === "ACCEPTED" 
                      ? "bg-green-600 text-white active:scale-95" 
                      : "bg-purple-500 text-white"
                  }`}
                >
                  <FiTag />
                  {existingOffer?.status === "ACCEPTED" 
                    ? "Offer Accepted" 
                    : existingOffer 
                    ? "Offer Pending" 
                    : "Make an Offer"}
                </button>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-1.5">
                Quantity:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  <FiMinus className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-16 h-8 text-center border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:border-orange-500 text-gray-400"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.quantity, quantity + 1))
                  }
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  <FiPlus className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Add to Cart Section */}
            <div className="mb-4">
              {cartItemQuantity !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-blue-600 w-4 h-4" />
                    <span className="text-xs font-semibold text-blue-900">
                      Already in cart ({cartItemQuantity}{" "}
                      {cartItemQuantity === 1 ? "item" : "items"})
                    </span>
                  </div>
                  <Link
                    href="/dashboard/customer/cart"
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 underline"
                  >
                    View Cart
                  </Link>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || checkingCart}
                  className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                >
                  {addingToCart ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      <span>
                        {cartItemQuantity !== null
                          ? "Updating..."
                          : "Adding..."}
                      </span>
                    </>
                  ) : checkingCart ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <FiShoppingCart className="w-4 h-4" />
                      {cartItemQuantity !== null ? (
                        <span>Update Quantity</span>
                      ) : (
                        <span>Add to Cart</span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2.5 bg-green-50 rounded-lg">
                <FiTruck className="w-5 h-5 text-green-600 mx-auto mb-1.5" />
                <p className="text-[10px] font-semibold text-gray-900">
                  Free Delivery
                </p>
                <p className="text-[9px] text-gray-600">Orders over ₦20k</p>
              </div>
              <div className="text-center p-2.5 bg-orange-50 rounded-lg">
                <FiShield className="w-5 h-5 text-orange-600 mx-auto mb-1.5" />
                <p className="text-[10px] font-semibold text-gray-900">
                  Secure Payment
                </p>
                <p className="text-[9px] text-gray-600">100% Protected</p>
              </div>
              <div className="text-center p-2.5 bg-purple-50 rounded-lg">
                <FiRefreshCw className="w-5 h-5 text-purple-600 mx-auto mb-1.5" />
                <p className="text-[10px] font-semibold text-gray-900">
                  Easy Returns
                </p>
                <p className="text-[9px] text-gray-600">7-day policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-4">
        <div className="flex gap-4 border-b mb-4">
          <button
            onClick={() => setActiveTab("description")}
            className={`pb-2 px-1 font-semibold text-xs transition-colors border-b-2 ${
              activeTab === "description"
                ? "text-gray-900 border-orange-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("specifications")}
            className={`pb-2 px-1 font-semibold text-xs transition-colors border-b-2 ${
              activeTab === "specifications"
                ? "text-gray-900 border-orange-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Specifications
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-2 px-1 font-semibold text-xs transition-colors border-b-2 ${
              activeTab === "reviews"
                ? "text-gray-900 border-orange-500"
                : "text-gray-500 border-transparent hover:text-gray-700 whitespace-nowrap"
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("shipping")}
            className={`pb-2 px-1 font-semibold text-xs transition-colors border-b-2 line-clamp-1 whitespace-nowrap ${
              activeTab === "shipping"
                ? "text-gray-900 border-orange-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            Shipping & Returns
          </button>
        </div>

        {/* Description Tab */}
        {activeTab === "description" && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              Product Description
            </h2>
            {product.description ? (
              <div className="text-gray-600 text-xs leading-relaxed mb-2">
                <p className="whitespace-pre-line">{product.description}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-xs italic mb-6">
                No description available.
              </p>
            )}

            {product.features && product.features.length > 0 && (
              <div className="mt-4">
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  Key Features
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-xs text-gray-700"
                    >
                      <span className="text-orange-500">•</span>
                      <span>{feature.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === "specifications" && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">
              Specifications
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-0.5">SKU</p>
                <p className="font-semibold text-xs text-black">
                  {product.sku}
                </p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-0.5">Category</p>
                <p className="font-semibold text-xs text-black">
                  {product.category?.name}
                </p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-0.5">Stock</p>
                <p className="font-semibold text-xs text-black">
                  {product.quantity} units
                </p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg">
                <p className="text-[10px] text-gray-500 mb-0.5">Vendor</p>
                <p className="font-semibold text-xs text-black">
                  {product.vendor?.businessName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab - CONTINUED IN NEXT MESSAGE DUE TO LENGTH */}
        {activeTab === "reviews" && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Customer Reviews
            </h2>

            {/* Rating Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {averageRating}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(averageRating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Based on {reviews.length}{" "}
                    {reviews.length === 1 ? "review" : "reviews"}
                  </p>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-8">
                        {star} star
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              reviews.length > 0
                                ? (ratingDistribution[star] / reviews.length) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-8">
                        {ratingDistribution[star]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Write Review Form */}
            {/* Write Review Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  {userExistingReview ? "Edit Your Review" : "Write a Review"}
                </h3>
                {userExistingReview && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <FiCheckCircle className="w-3 h-3" />
                    You've reviewed this product
                  </span>
                )}
              </div>

              {!currentUser && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-orange-800">
                    Please{" "}
                    <Link
                      href="/login"
                      className="font-semibold underline hover:text-orange-900"
                    >
                      login
                    </Link>{" "}
                    to leave a review.
                  </p>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Your Rating:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={!currentUser}
                      onMouseEnter={() => currentUser && setHoverRating(star)}
                      onMouseLeave={() => currentUser && setHoverRating(0)}
                      onClick={() => currentUser && setUserRating(star)}
                      className={`transition-transform ${
                        currentUser
                          ? "hover:scale-125 cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <FiStar
                        className={`w-7 h-7 ${
                          star <= (hoverRating || userRating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="text-xs text-gray-600 ml-2">
                      {userRating} out of 5
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Your Review:
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  disabled={!currentUser}
                  placeholder={
                    currentUser
                      ? "Share your experience with this product... (minimum 10 characters)"
                      : "Login to write a review"
                  }
                  rows="4"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none text-gray-700 placeholder-gray-400 ${
                    !currentUser ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {reviewText.length}/10 characters minimum
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReview}
                  disabled={
                    submittingReview ||
                    !currentUser ||
                    reviewText.trim().length < 10
                  }
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-xs font-semibold ${
                    !currentUser ||
                    submittingReview ||
                    reviewText.trim().length < 10
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : userExistingReview
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {submittingReview
                    ? userExistingReview
                      ? "Updating..."
                      : "Submitting..."
                    : userExistingReview
                    ? "Update Review"
                    : "Submit Review"}
                </button>

                {userExistingReview && currentUser && (
                  <button
                    onClick={handleDeleteReview}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-semibold"
                  >
                    Delete
                  </button>
                )}
              </div>

              {userExistingReview && (
                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3 text-green-500" />
                  Last updated:{" "}
                  {new Date(userExistingReview.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-8">
                  No reviews yet. Be the first to review this product!
                </p>
              ) : (
                <div>
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-900">
                              {review.customer?.firstName}{" "}
                              {review.customer?.lastName}
                            </span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <FiStar
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            {/* ✅ Show "Edited" badge if review was updated */}
                            {new Date(review.updatedAt).getTime() >
                              new Date(review.createdAt).getTime() + 60000 && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                Edited
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed mb-3">
                        {review.comment}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] text-gray-500">
                        <button className="flex items-center gap-1 hover:text-green-600 transition-colors">
                          <FiThumbsUp className="w-3 h-3" />
                          Helpful ({review.helpfulCount || 0})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === "shipping" && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">
              Shipping & Returns
            </h2>
            <div className="space-y-3 text-xs text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-xs">
                  Shipping Policy
                </h3>
                <p>Free shipping on orders over ₦20,000</p>
                <p>Standard delivery: 3-5 business days</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-xs">
                  Return Policy
                </h3>
                <p>7-day return policy</p>
                <p>Items must be unused and in original packaging</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">
              You May Also Like
            </h2>
            <Link
              href="/shop"
              className="text-orange-500 hover:text-orange-600 font-semibold text-xs flex items-center gap-1"
            >
              View All
              <FiArrowLeft className="rotate-180 w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedProducts.map((relatedProduct) => (
              <Link
                key={relatedProduct._id}
                href={`/dashboard/customer/products/${relatedProduct._id}`}
                className="bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden group"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {relatedProduct.images?.[0] ? (
                    <img
                      src={relatedProduct.images[0]}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiPackage className="text-gray-300 text-4xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-gray-900 mb-1 line-clamp-1">
                    {relatedProduct.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 mb-2">
                    {relatedProduct.vendor?.businessName}
                  </p>
                  <p className="text-sm font-bold text-orange-600">
                    {formatCurrency(relatedProduct.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Make an Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiTag className="text-purple-600" />
                Make an Offer
              </h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {product.name}
              </p>
              <p className="text-xs text-gray-600">
                Current Price: {formatCurrency(product.price)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Minimum Price (₦) *
                </label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    min="1"
                    step="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Maximum Price (₦) *
                </label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g., 65000"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    min="1"
                    step="1000"
                  />
                </div>
                {minPrice && maxPrice && parseFloat(maxPrice) > parseFloat(minPrice) && (
                  <p className="text-xs text-green-600 mt-1">
                    Potential savings: Up to{" "}
                    {formatCurrency(product.price - parseFloat(minPrice))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Note to Vendor (Optional)
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Why this price? Any special requests?"
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none text-gray-900 placeholder-gray-500"
                  maxLength="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customerNote.length}/500 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 The vendor will review your offer and can accept or decline. If
                  accepted, you'll be able to chat to finalize the exact price!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakeOffer}
                  disabled={submittingOffer}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {submittingOffer ? "Submitting..." : "Submit Offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
