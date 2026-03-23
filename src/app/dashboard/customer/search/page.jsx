"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiSearch,
  FiPackage,
  FiHeart,
  FiStar,
  FiShoppingCart,
  FiX,
  FiEye,
  FiFilter,
} from "react-icons/fi";
import toast from "react-hot-toast";

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(query);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productRatings, setProductRatings] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [togglingWishlist, setTogglingWishlist] = useState({});

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ minPrice: "", maxPrice: "", location: "" });

  const handleApplyFilters = () => setAppliedFilters({ minPrice, maxPrice, location });
  const handleClearFilters = () => {
    setMinPrice(""); setMaxPrice(""); setLocation(""); setMinRating(0);
    setAppliedFilters({ minPrice: "", maxPrice: "", location: "" });
  };

  // Debounced live search — fires 350ms after user stops typing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts([]);
      setProductRatings({});
      return;
    }
    const timer = setTimeout(() => {
      fetchProducts(searchTerm.trim(), appliedFilters);
      // Keep URL in sync without a full navigation
      router.replace(`/dashboard/customer/search?q=${encodeURIComponent(searchTerm.trim())}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, appliedFilters]);

  useEffect(() => {
    fetchWishlistStatus();
  }, []);

  const fetchProducts = async (q, filters = appliedFilters) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const queryParams = new URLSearchParams();
      queryParams.append("search", q);
      if (filters.minPrice) queryParams.append("minPrice", filters.minPrice);
      if (filters.maxPrice) queryParams.append("maxPrice", filters.maxPrice);
      if (filters.location) queryParams.append("location", filters.location);
      
      const res = await fetch(`/api/products?${queryParams.toString()}`, { headers });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        if (data.products && data.products.length > 0) {
          const productIds = data.products.map((p) => p._id);
          const ratingsRes = await fetch("/api/products/ratings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds }),
          });
          const ratingsData = await ratingsRes.json();
          if (ratingsData.success) setProductRatings(ratingsData.ratings || {});
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlistStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const res = await fetch("/api/customer/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWishlistItems(
          new Set(data.wishlist.map((i) => i.productId._id || i.productId))
        );
      }
    } catch {}
  };


  const handleToggleWishlist = async (productId, productName) => {
    const token = localStorage.getItem("authToken");
    if (!token) { toast.error("Please login to add to wishlist"); router.push("/login"); return; }
    setTogglingWishlist((p) => ({ ...p, [productId]: true }));
    try {
      if (wishlistItems.has(productId)) {
        const res = await fetch("/api/customer/wishlist", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const item = data.wishlist.find((w) => (w.productId._id || w.productId) === productId);
        if (item) {
          const del = await fetch(`/api/customer/wishlist/${item._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          const delData = await del.json();
          if (delData.success) {
            toast.success("Removed from wishlist");
            setWishlistItems((prev) => { const s = new Set(prev); s.delete(productId); return s; });
          }
        }
      } else {
        const res = await fetch("/api/customer/wishlist/add", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (data.success) { toast.success(`${productName} added to wishlist`); setWishlistItems((prev) => new Set(prev).add(productId)); }
        else toast.error(data.message || "Failed to add to wishlist");
      }
    } catch { toast.error("Failed to update wishlist"); }
    finally { setTogglingWishlist((p) => ({ ...p, [productId]: false })); }
  };

  const handleAddToCart = async (product) => {
    setAddingToCart((p) => ({ ...p, [product._id]: true }));
    try {
      const token = localStorage.getItem("authToken");
      if (!token) { toast.error("Please login to add items to cart"); router.push("/login"); return; }
      const res = await fetch("/api/customer/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product._id, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`${product.name} added to cart!`); window.dispatchEvent(new Event("cartUpdated")); }
      else toast.error(data.message || "Failed to add to cart");
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingToCart((p) => ({ ...p, [product._id]: false })); }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const toSentenceCase = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const isDiscountActive = (product) => {
    if (!product.discountPercentage || product.discountPercentage === 0) return false;
    const now = new Date();
    const start = product.discountStartDate ? new Date(product.discountStartDate) : null;
    const end = product.discountEndDate ? new Date(product.discountEndDate) : null;
    return (!start || now >= start) && (!end || now <= end);
  };

  const getDiscountedPrice = (product) =>
    isDiscountActive(product) ? product.price * (1 - product.discountPercentage / 100) : product.price;

  const filteredProducts = products.filter((product) => {
    if (minRating > 0) {
      const ratingData = productRatings[product._id];
      const avg = ratingData ? ratingData.average : 0;
      if (avg < minRating) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm mb-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Search Results
          </h2>
          {!loading && searchTerm.trim() && (
            <p className="text-gray-600 text-xs sm:text-sm">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for&nbsp;
              <span className="font-semibold text-orange-500">"{searchTerm}"</span>
            </p>
          )}
          {loading && searchTerm.trim() && (
            <p className="text-gray-400 text-xs sm:text-sm">Searching...</p>
          )}
        </div>

        {/* Live search bar */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
          />
          {searchTerm && !loading && (
            <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-3.5 w-3.5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiFilter /> Filters
            </h3>

            {/* Price */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Price Range (₦)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none placeholder-gray-400" />
                <span className="text-gray-400">-</span>
                <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none placeholder-gray-400" />
              </div>
            </div>

            {/* Location */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Location</label>
              <input type="text" placeholder="State/City" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none placeholder-gray-400" />
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Minimum Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                   <button key={star} onClick={() => setMinRating(star)} className={`text-xl transition-transform hover:scale-110 ${minRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>
                     <FiStar className={minRating >= star ? "fill-current" : ""} />
                   </button>
                ))}
                {minRating > 0 && <span className="text-xs text-gray-500 ml-2 font-semibold">& Up</span>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={handleApplyFilters} className="w-full py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20">Apply Filters</button>
              <button onClick={handleClearFilters} className="w-full py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">Clear All</button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-4">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 w-full justify-center transition-colors">
              <FiFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Initial prompt — nothing typed yet */}
          {!searchTerm.trim() && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <FiSearch className="text-5xl text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Start typing to search products...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredProducts.length === 0 && searchTerm.trim() && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <FiSearch className="text-4xl text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">No results found</h3>
              <p className="text-gray-500 text-sm">
                We couldn't find any products matching your search and filters.
              </p>
            </div>
          )}

          {/* Results grid */}
          {!loading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
            const mainImage = product.images?.[0];
            const hasActiveDiscount = isDiscountActive(product);
            const discountedPrice = getDiscountedPrice(product);
            const isAdding = addingToCart[product._id];
            const ratingData = productRatings[product._id];
            const hasRatings = ratingData && ratingData.count > 0;
            const averageRating = hasRatings ? ratingData.average : 0;
            const reviewCount = hasRatings ? ratingData.count : 0;
            const isInWishlist = wishlistItems.has(product._id);

            return (
              <div key={product._id} className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="relative bg-linear-to-br from-orange-100 via-yellow-50 to-green-100">
                  <div className="relative h-44">
                    {mainImage ? (
                      <img src={mainImage} alt={product.name} className="w-full h-full object-cover rounded-tr-xl rounded-tl-xl" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white rounded-xl">
                        <FiPackage className="text-gray-300 text-4xl" />
                      </div>
                    )}
                  </div>
                    <div className="absolute top-4 left-2.5 flex flex-col gap-1">
                      {hasActiveDiscount && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">-{product.discountPercentage}% OFF</span>
                      )}
                      {product.activeSlashId && (
                        <span className="bg-linear-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">🔥 Group Buy</span>
                      )}
                      {product.hasActivePowerHour && (
                        <span className="bg-linear-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">⚡ Power Hour</span>
                      )}
                      {product.hasAcceptedOffer && (
                        <span className="bg-linear-to-r from-green-500 to-emerald-600 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">✅ Offer Accepted</span>
                      )}
                    </div>
                  <button
                    onClick={() => handleToggleWishlist(product._id, product.name)}
                    disabled={togglingWishlist[product._id]}
                    className="absolute top-4 right-4 w-8 h-8 bg-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md disabled:opacity-50"
                  >
                    {togglingWishlist[product._id] ? (
                      <svg className="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <FiHeart className={`text-base ${isInWishlist ? "text-red-500 fill-current" : "text-gray-700"}`} />
                    )}
                  </button>
                </div>

                <div className="p-3">
                  <div className="mb-1.5">
                    <span className="text-xs text-gray-900 font-semibold">{product.category?.name || "Uncategorized"}</span>
                  </div>
                  <Link href={`/dashboard/customer/products/${product._id}`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1 hover:text-orange-500 transition-colors cursor-pointer">{toSentenceCase(product.name)}</h3>
                  </Link>
                  <p className="text-[10px] text-gray-500 mb-1.5">by {product.vendor?.businessName || "Local Vendor"}</p>
                  <div className="flex items-center gap-1 mb-2 text-gray-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    <span className="text-[10px]">{product.vendor?.city || "Nigeria"}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {hasRatings ? (
                      <><FiStar className="text-yellow-400 text-xs fill-current" /><span className="text-xs font-bold text-gray-900">{averageRating.toFixed(1)}</span><span className="text-[9px] text-gray-500">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span></>
                    ) : (
                      <span className="text-[9px] text-gray-400 italic">No reviews yet</span>
                    )}
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(product.hasAcceptedOffer ? product.exclusivePrice : (hasActiveDiscount ? discountedPrice : product.price))}
                    </span>
                    {(hasActiveDiscount || product.hasAcceptedOffer) && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isAdding}
                      className={`flex-1 py-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${isAdding ? "bg-gray-400 cursor-not-allowed text-white" : "bg-linear-to-r from-orange-500 to-green-500 text-white hover:shadow-lg hover:scale-[1.02]"}`}
                    >
                      {isAdding ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Adding...</span></>) : (<><FiShoppingCart className="w-3 h-3" />Add to Cart</>)}
                    </button>
                    <Link href={`/dashboard/customer/products/${product._id}`} className="px-2.5 py-2 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-all flex items-center justify-center" title="View Details">
                      <FiEye className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
