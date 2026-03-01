"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiSearch,
  FiPackage,
  FiHeart,
  FiStar,
  FiShoppingCart,
  FiX,
  FiGrid,
  FiList,
  FiEye,
  FiArrowRight,
} from "react-icons/fi";
import {
  LuApple,
  LuPaintbrushVertical,
  LuCar,
  LuBookCopy,
  LuCoffee,
  LuSmartphone,
  LuDumbbell,
  LuBaby,
  LuLeaf,
  LuWrench,
  LuSprout,
  LuBox,
} from "react-icons/lu";
import { IoShirtOutline, IoSparklesOutline } from "react-icons/io5";
import toast from "react-hot-toast";

const CATEGORY_STYLES = {
  "Fashion & Apparel": {
    gradient: "from-pink-600/80 to-red-700/80",
    bg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80",
    icon: IoShirtOutline,
  },
  "Electronics & Gadgets": {
    gradient: "from-teal-600/80 to-cyan-700/80",
    bg: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=80",
    icon: LuSmartphone,
  },
  "Food & Beverages": {
    gradient: "from-green-600/80 to-green-800/80",
    bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    icon: LuApple,
  },
  "Beauty & Personal Care": {
    gradient: "from-orange-600/80 to-orange-800/80",
    bg: "https://images.unsplash.com/photo-1763987300719-fd27c51a3227?q=80&w=1200&auto=format&fit=crop",
    icon: IoSparklesOutline,
  },
  "Home & Furniture": {
    gradient: "from-purple-500/80 to-pink-600/80",
    bg: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80",
    icon: LuCoffee,
  },
  "Health & Wellness": {
    gradient: "from-lime-600/80 to-green-700/80",
    bg: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
    icon: LuLeaf,
  },
  "Sports & Fitness": {
    gradient: "from-blue-500/80 to-blue-700/80",
    bg: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80",
    icon: LuDumbbell,
  },
  "Toys & Kids": {
    gradient: "from-yellow-600/80 to-amber-700/80",
    bg: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&q=80",
    icon: LuBaby,
  },
  "Books & Stationery": {
    gradient: "from-violet-600/80 to-indigo-700/80",
    bg: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
    icon: LuBookCopy,
  },
  "Automobile & Parts": {
    gradient: "from-gray-700/80 to-gray-900/80",
    bg: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80",
    icon: LuCar,
  },
  "Agriculture & Farm Produce": {
    gradient: "from-lime-500/80 to-green-700/80",
    bg: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80",
    icon: LuSprout,
  },
  "Arts, Crafts & Culture": {
    gradient: "from-rose-600/80 to-pink-700/80",
    bg: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?q=80&w=1200&auto=format&fit=crop",
    icon: LuPaintbrushVertical,
  },
  "Services": {
    gradient: "from-indigo-600/80 to-purple-700/80",
    bg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    icon: LuWrench,
  },
  "Others": {
    gradient: "from-slate-600/80 to-zinc-700/80",
    bg: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
    icon: LuBox,
  },
};

const DEFAULT_STYLE = {
  gradient: "from-orange-600/80 to-orange-800/80",
  bg: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
  icon: LuBox,
};

export default function CategoryProductsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id;

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [addingToCart, setAddingToCart] = useState({});
  const [productRatings, setProductRatings] = useState({});
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [togglingWishlist, setTogglingWishlist] = useState({});

  useEffect(() => {
    fetchData();
    fetchWishlistStatus();
  }, [categoryId]);

  const fetchData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`/api/categories/${categoryId}`),
        fetch(`/api/products?categoryId=${categoryId}`),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();

      if (catData.success) {
        setCategory(catData.category);
      } else {
        toast.error("Category not found");
        router.push("/dashboard/customer/categories");
        return;
      }

      if (prodData.success) {
        setProducts(prodData.products || []);
        if (prodData.products && prodData.products.length > 0) {
          const productIds = prodData.products.map((p) => p._id);
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
      console.error("Error fetching category data:", error);
      toast.error("Failed to load category products");
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

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.vendor?.businessName && p.vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const catStyle = category ? (CATEGORY_STYLES[category.name] || DEFAULT_STYLE) : DEFAULT_STYLE;
  const CategoryIcon = catStyle.icon;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">

      {/* ── Banner ── */}
      <div className="relative h-44 md:h-52 rounded-2xl overflow-hidden mb-6 md:mb-8">
        {/* Background image */}
        <img
          src={catStyle.bg}
          alt={category?.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay — same style as category cards */}
        <div className={`absolute inset-0 bg-linear-to-br ${catStyle.gradient}`}></div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-4 md:p-6">
          {/* Top row: back + icon */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <CategoryIcon className="text-xl text-white" />
            </div>
          </div>

          {/* Bottom: title + count */}
          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">
              {category?.name || "Category"}
            </h1>
            <p className="text-xs text-white/90 flex items-center gap-1">
              <span>{products.length} product{products.length !== 1 ? "s" : ""} available</span>
              <FiArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>

      {/* ── Search + View Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-orange-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            <FiGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-orange-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            <FiList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FiPackage className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {searchTerm ? "No results found" : "No Products Yet"}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchTerm
              ? `No products match "${searchTerm}" in this category.`
              : `No products have been listed in ${category?.name || "this category"} yet.`}
          </p>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="mt-4 text-orange-500 hover:text-orange-600 text-sm font-semibold">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* ── Grid View ── */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((product) => {
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
                  {hasActiveDiscount && (
                    <div className="absolute top-4 left-2.5">
                      <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-lg">-{product.discountPercentage}% OFF</span>
                    </div>
                  )}
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
                    <span className="text-xs text-gray-900 font-semibold">{category?.name || "Uncategorized"}</span>
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
                    {hasActiveDiscount ? (
                      <><span className="text-lg font-bold text-green-600">{formatCurrency(discountedPrice)}</span><span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span></>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</span>
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

      {/* ── List View ── */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="flex flex-col gap-3">
          {filtered.map((product) => {
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
              <div key={product._id} className="bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 flex gap-3 p-3">
                {/* Image */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-linear-to-br from-orange-100 via-yellow-50 to-green-100">
                  {mainImage ? (
                    <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FiPackage className="text-gray-300 text-2xl" /></div>
                  )}
                  {hasActiveDiscount && (
                    <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{product.discountPercentage}%</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-orange-500 font-semibold">{category?.name}</span>
                    <Link href={`/dashboard/customer/products/${product._id}`}>
                      <h3 className="text-sm font-bold text-gray-900 hover:text-orange-500 transition-colors line-clamp-1 mt-0.5">{toSentenceCase(product.name)}</h3>
                    </Link>
                    <p className="text-[10px] text-gray-500 mt-0.5 mb-1">by {product.vendor?.businessName || "Local Vendor"}</p>
                    {hasRatings && (
                      <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-400 text-xs fill-current" />
                        <span className="text-xs font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                        <span className="text-[9px] text-gray-500">({reviewCount})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {hasActiveDiscount ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-bold text-green-600">{formatCurrency(discountedPrice)}</span>
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                        </div>
                      ) : (
                        <span className="text-base font-bold text-gray-900">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWishlist(product._id, product.name)}
                        disabled={togglingWishlist[product._id]}
                        className="w-8 h-8 bg-gray-50 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors border border-gray-100"
                      >
                        <FiHeart className={`text-sm ${isInWishlist ? "text-red-500 fill-current" : "text-gray-500"}`} />
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${isAdding ? "bg-gray-400 text-white cursor-not-allowed" : "bg-linear-to-r from-orange-500 to-green-500 text-white hover:shadow-md"}`}
                      >
                        {isAdding ? (
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <><FiShoppingCart className="w-3 h-3" />Add to Cart</>
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
  );
}
