"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiShoppingCart2Line } from "react-icons/ri";
import {
  FiHome, FiGrid, FiTag, FiSearch, FiBell, FiHeart, FiStar,
  FiMenu, FiX, FiLogIn, FiPackage, FiArrowRight, FiEye,
  FiShoppingCart, FiChevronLeft, FiChevronRight, FiFilter,
} from "react-icons/fi";
import {
  TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand,
} from "react-icons/tb";
import { LuApple, LuSmartphone, LuPaintbrushVertical, LuCar, LuBookCopy, LuCoffee, LuHammer } from "react-icons/lu";
import { IoShirtOutline, IoSparklesOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import Image from "next/image";
import LanguageSelector from "@/components/LanguageSelector";
import { useSync } from "@/contexts/SyncContext";

/* ─── Notification dropdown (guest-safe) ─── */
function NotifDropdown({ isLoggedIn }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { counts } = useSync();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 group transition-colors border border-gray-200 dark:border-gray-700 outline-none relative"
      >
        <FiBell className="text-base text-gray-600 dark:text-gray-300 group-hover:text-white" />
        {isLoggedIn && counts.notifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
            {counts.notifications > 99 ? "99+" : counts.notifications}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
          </div>
          <div className="p-6 text-center flex flex-col items-center gap-3">
            <div className="bg-orange-50 p-4 rounded-full">
              <FiBell className="w-6 h-6 text-orange-400" />
            </div>
            {isLoggedIn
              ? (counts.notifications > 0 
                  ? <div className="flex flex-col gap-2">
                      <p className="text-sm text-gray-700 dark:text-white font-semibold">You have {counts.notifications} action items</p>
                      <Link href="/dashboard/customer" className="text-xs text-orange-600 hover:underline">View in dashboard</Link>
                    </div>
                  : <p className="text-sm text-gray-500">No new notifications</p>
                )
              : <>
                  <p className="text-sm font-semibold text-gray-700 dark:text-white">Stay in the loop</p>
                  <p className="text-xs text-gray-400">Login to receive order updates &amp; messages</p>
                  <Link href="/login" className="mt-1 px-5 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition">
                    Login to View
                  </Link>
                </>
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
const fmt = (n) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);
const sentenceCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
const isDiscountActive = (p) => {
  if (!p.discountPercentage) return false;
  const now = new Date();
  const s = p.discountStartDate ? new Date(p.discountStartDate) : null;
  const e = p.discountEndDate   ? new Date(p.discountEndDate)   : null;
  return (!s || now >= s) && (!e || now <= e);
};
const getDiscounted = (p) => isDiscountActive(p) ? p.price * (1 - p.discountPercentage / 100) : p.price;

const heroSlides = [
  { id: 1, title: "Farm Fresh Produce", subtitle: "Organically grown fruits & vegetables delivered straight from local farms to your doorstep.", badge: "Fresh Daily", badgeIcon: "🌿", btn: "Shop Fresh", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80", overlay: "bg-black/30" },
  { id: 2, title: "Artisan Crafts",     subtitle: "Unique handcrafted products by skilled local artisans. Each piece tells a story of culture.", badge: "Handmade", badgeIcon: "✨", btn: "Discover", img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=80", overlay: "bg-black/40" },
  { id: 3, title: "Latest Tech",        subtitle: "High-quality electronics & gadgets from trusted local vendors. Stay current.", badge: "New Arrivals", badgeIcon: "⚡", btn: "Explore", img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80", overlay: "bg-black/50" },
];

const catStyles = [
  { gradient: "from-green-600/80 to-green-800/80", bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80", icon: <LuApple className="text-base text-white" /> },
  { gradient: "from-purple-600/80 to-purple-800/80", bg: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?q=80&w=688", icon: <LuPaintbrushVertical className="text-base text-white" /> },
  { gradient: "from-gray-700/80 to-gray-900/80", bg: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80", icon: <LuCar className="text-base text-white" /> },
  { gradient: "from-orange-600/80 to-orange-800/80", bg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80", icon: <IoSparklesOutline className="text-base text-white" /> },
  { gradient: "from-purple-500/80 to-pink-600/80", bg: "https://images.unsplash.com/photo-1581462700959-99ee74a9bc6d?q=80&w=687", icon: <LuBookCopy className="text-base text-white" /> },
  { gradient: "from-teal-600/80 to-cyan-700/80", bg: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80", icon: <LuSmartphone className="text-base text-white" /> },
  { gradient: "from-pink-600/80 to-red-700/80", bg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80", icon: <IoShirtOutline className="text-base text-white" /> },
  { gradient: "from-blue-500/80 to-blue-700/80", bg: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80", icon: <LuCoffee className="text-base text-white" /> },
];

/* ═══════════════════════════════════════════════════════════════ */
export default function StorefrontPage() {
  const router = useRouter();
  const { counts } = useSync();

  // ── auth state ──
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [user, setUser]                 = useState(null);

  // ── layout ──
  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [stickySearch, setStickySearch] = useState(false);
  const [headerQ, setHeaderQ]           = useState("");

  // ── data ──
  const [loading, setLoading]           = useState(true);
  const [categories, setCategories]     = useState([]);
  const [products, setProducts]         = useState([]);
  const [ratings, setRatings]           = useState({});
  const [wishlist, setWishlist]         = useState(new Set());
  const [addingCart, setAddingCart]     = useState({});
  const [togWishlist, setTogWishlist]   = useState({});
  const [slide, setSlide]               = useState(0);
  const [searchQ, setSearchQ]           = useState("");

  // ── Search & Filter State ──
  const [minPrice, setMinPrice]         = useState("");
  const [maxPrice, setMaxPrice]         = useState("");
  const [location, setLocation]         = useState("");
  const [minRating, setMinRating]       = useState(0);
  const [showFilters, setShowFilters]   = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    minPrice: "",
    maxPrice: "",
    location: "",
    minRating: 0,
    active: false,
  });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);

  /* ── detect login (non-blocking) ── */
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    const checkUser = () => {
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.user.role === "CUSTOMER") {
            setIsLoggedIn(true);
            setUser({
              ...d.user,
              profilePicture: d.user.profilePicture
            });
          }
        }).catch(() => {});
    };

    checkUser();
    if (typeof window !== 'undefined') {
      window.addEventListener("profileUpdated", checkUser);
      return () => window.removeEventListener("profileUpdated", checkUser);
    }
  }, []);

  /* ── hero auto-advance ── */
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setSlide(p => (p + 1) % heroSlides.length);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  /* ── sticky search ── */
  useEffect(() => {
    const h = () => setStickySearch(window.scrollY > 450);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
    
  /* ── fetch data ── */
  useEffect(() => {
    (async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products?limit=8"),
        ]);
        const catData  = await catRes.json();
        const prodData = await prodRes.json();
        if (catData.success)  setCategories((catData.categories  || []).slice(0, 8));
        if (prodData.success) {
          setProducts(prodData.products || []);
          const ids = (prodData.products || []).map(p => p._id);
          if (ids.length) {
            const rRes = await fetch("/api/products/ratings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productIds: ids }),
            });
            const rData = await rRes.json();
            if (rData.success) setRatings(rData.ratings || {});
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const fetchFilteredProducts = async (filters) => {
    setLoading(true);
    setIsFiltering(true);
    try {
      const { minPrice, maxPrice, location } = filters;
      let url = `/api/products?`;
      if (searchQ) url += `search=${encodeURIComponent(searchQ)}&`;
      if (minPrice) url += `minPrice=${minPrice}&`;
      if (maxPrice) url += `maxPrice=${maxPrice}&`;
      if (location) url += `location=${encodeURIComponent(location)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFilteredProducts(data.products || []);
        
        // Fetch ratings for new products
        const ids = (data.products || []).map(p => p._id);
        if (ids.length > 0) {
          const rRes = await fetch("/api/products/ratings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: ids }),
          });
          const rData = await rRes.json();
          if (rData.success) {
            setRatings(prev => ({ ...prev, ...rData.ratings }));
          }
        }
      }
    } catch (error) {
      console.error("Error filtering products:", error);
      toast.error("Failed to filter products");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const filters = { minPrice, maxPrice, location, minRating, active: true };
    setAppliedFilters(filters);
    fetchFilteredProducts(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setMinRating(0);
    setAppliedFilters({ minPrice: "", maxPrice: "", location: "", minRating: 0, active: false });
    setIsFiltering(false);
    setFilteredProducts([]);
  };

  const displayProducts = isFiltering 
    ? filteredProducts.filter(p => !appliedFilters.minRating || (ratings[p._id]?.average || 0) >= appliedFilters.minRating)
    : products;

  /* ── fetch wishlist ── */
  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch("/api/customer/wishlist", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setWishlist(new Set(d.wishlist.map(i => i.productId._id || i.productId)));
      }).catch(() => {});
  }, [isLoggedIn]);

  /* ── handlers ── */
  const requireLogin = (msg = "Please login first") => {
    toast.error(msg);
    router.push("/login");
  };

  const handleAddToCart = async (product) => {
    if (!isLoggedIn) { requireLogin("Please login to add items to cart"); return; }
    setAddingCart(p => ({ ...p, [product._id]: true }));
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/customer/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product._id, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`${product.name} added to cart!`); window.dispatchEvent(new Event("cartUpdated")); }
      else toast.error(data.message || "Failed to add to cart");
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingCart(p => ({ ...p, [product._id]: false })); }
  };

  const handleToggleWishlist = async (productId, name) => {
    if (!isLoggedIn) { requireLogin("Please login to save to wishlist"); return; }
    setTogWishlist(p => ({ ...p, [productId]: true }));
    try {
      const token = localStorage.getItem("authToken");
      if (wishlist.has(productId)) {
        const wRes = await fetch("/api/customer/wishlist", { headers: { Authorization: `Bearer ${token}` } });
        const wData = await wRes.json();
        const item = wData.wishlist.find(i => (i.productId._id || i.productId) === productId);
        if (item) {
          await fetch(`/api/customer/wishlist/${item._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          toast.success("Removed from wishlist");
          setWishlist(p => { const s = new Set(p); s.delete(productId); return s; });
        }
      } else {
        const res = await fetch("/api/customer/wishlist/add", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json();
        if (data.success) { toast.success(`${name} added to wishlist`); setWishlist(p => new Set(p).add(productId)); }
      }
    } catch { toast.error("Failed to update wishlist"); }
    finally { setTogWishlist(p => ({ ...p, [productId]: false })); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const filters = { ...appliedFilters, active: true };
    setAppliedFilters(filters);
    fetchFilteredProducts(filters);
    
    // Scroll to products section
    const productsSection = document.getElementById("products");
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    if (headerQ.trim()) {
      setSearchQ(headerQ);
      const filters = { ...appliedFilters, active: true };
      setAppliedFilters(filters);
      fetchFilteredProducts(filters);
      setHeaderQ("");
      
      const productsSection = document.getElementById("products");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const initials = user ? user.firstName.charAt(0).toUpperCase() + (user.lastName?.charAt(0).toUpperCase() || "") : "?";

  const navLinks = [
    { name: "Home",        href: "/",                         icon: FiHome },
    { name: "Categories",  href: "#categories",               icon: FiGrid },
    { name: "Deals",       href: "#products",                 icon: FiTag },
  ];

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50 shadow-sm">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white">
          {mobileOpen ? <FiX size={20}/> : <FiMenu size={20}/>}
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-br from-green-600 to-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow">A</div>
          <span className="font-extrabold text-gray-900 dark:text-white tracking-tight">Afri<span className="text-orange-500">Cart</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <NotifDropdown isLoggedIn={isLoggedIn}/>
          <button
            onClick={() => isLoggedIn ? router.push("/dashboard/customer/cart") : requireLogin("Please login to view your cart")}
            className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 group transition-colors border border-gray-200 dark:border-gray-700"
          >
            <RiShoppingCart2Line className="text-base text-gray-600 dark:text-gray-300 group-hover:text-white"/>
            {isLoggedIn && counts.cart > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{counts.cart > 99 ? "99+" : counts.cart}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)}/>}

      {/* Mobile sticky search */}
      <div className={`lg:hidden fixed top-16 inset-x-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 shadow-sm z-30 transition-all duration-300 ${stickySearch ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="p-3">
          <form onSubmit={handleHeaderSearch}>
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="pl-3 text-gray-400"><FiSearch size={15}/></div>
              <input value={headerQ} onChange={e => setHeaderQ(e.target.value)} placeholder="Search products..." className="flex-1 px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none placeholder-gray-400"/>
              <button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-[10px] hover:bg-orange-600 transition mr-0.5"><FiSearch size={14}/></button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Desktop Topbar ── */}
      <div className="hidden lg:block fixed top-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-20 shadow-sm transition-all duration-300"
        style={{ left: collapsed ? "60px" : "232px", width: collapsed ? "calc(100% - 60px)" : "calc(100% - 232px)" }}>
        <div className="h-full flex items-center justify-between px-5 gap-4">
          <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 group transition-colors border border-gray-200 dark:border-gray-700 outline-none shrink-0">
            {collapsed
              ? <TbLayoutSidebarLeftCollapse className="text-gray-600 dark:text-gray-300 text-xl group-hover:text-white"/>
              : <TbLayoutSidebarLeftExpand   className="text-gray-600 dark:text-gray-300 text-xl group-hover:text-white"/>}
          </button>

          {/* Sticky search */}
          <div className={`flex-1 max-w-2xl transition-all duration-300 ${stickySearch ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
            <form onSubmit={handleHeaderSearch}>
              <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-400 transition">
                <div className="pl-3 text-gray-400"><FiSearch size={15}/></div>
                <input value={headerQ} onChange={e => setHeaderQ(e.target.value)} placeholder="Search AfriCart..." className="flex-1 px-3 py-2.5 text-xs text-gray-900 dark:text-white bg-transparent focus:outline-none placeholder-gray-400"/>
                <button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-[10px] hover:bg-orange-600 transition mr-0.5"><FiSearch size={14}/></button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSelector/>
            <NotifDropdown isLoggedIn={isLoggedIn}/>
            <button
              onClick={() => isLoggedIn ? router.push("/dashboard/customer/cart") : requireLogin("Please login to view your cart")}
              className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 group transition-colors border border-gray-200 dark:border-gray-700"
            >
              <RiShoppingCart2Line className="text-base text-gray-600 dark:text-gray-300 group-hover:text-white"/>
              {isLoggedIn && counts.cart > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{counts.cart > 99 ? "99+" : counts.cart}</span>
              )}
            </button>
            {isLoggedIn ? (
              <Link href="/dashboard/customer" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-linear-to-r from-green-500 to-orange-500 text-white text-xs font-bold shadow hover:opacity-90 transition">
                <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center font-bold text-[10px] overflow-hidden">
                  {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" /> : initials}
                </div>
                <span>{user?.firstName}</span>
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-[10px] rounded-lg bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold shadow hover:shadow-lg hover:scale-[1.02] transition-all">
                <FiLogIn size={14}/> Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col justify-between z-40 overflow-y-auto scrollbar-thin ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 ${collapsed ? "lg:w-[60px]" : "lg:w-58"} w-64`}>
        <div>
          {/* Logo */}
          <div className={`h-14 flex items-center border-b border-gray-200 dark:border-gray-700 gap-3 transition-all duration-300 ${collapsed ? "lg:justify-center lg:px-2" : "px-4"}`}>
            <div className="w-9 h-9 bg-linear-to-br from-green-600 to-orange-500 rounded-xl flex text-sm items-center justify-center text-white font-black shadow-md shrink-0">A</div>
            <span className={`font-extrabold text-gray-900 dark:text-white text-lg tracking-tight whitespace-nowrap transition-all duration-300 ${collapsed ? "lg:hidden" : ""}`}>
              Afri<span className="text-orange-500">Cart</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="mt-4 px-2 flex flex-col gap-1">
            {navLinks.map(({ name, href, icon: Icon }) => (
              <Link key={name} href={href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 ${collapsed ? "lg:justify-center" : ""}`}>
                <Icon className="text-xl shrink-0"/>
                <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "lg:hidden" : ""}`}>{name}</span>
              </Link>
            ))}
          </nav>

          {/* Filters - Persistent in sidebar */}
          {!collapsed && (
            <div className="mt-6 px-4">
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FiFilter className="text-xs" /> Filters
                  </span>
                  {appliedFilters.active && (
                    <button onClick={handleClearFilters} className="text-[10px] text-orange-500 hover:underline">Clear</button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Price</label>
                    <div className="flex gap-2 mt-1.5">
                      <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                      <input type="number" placeholder="Max" value={maxPrice} onChange={e => setFilterMaxPrice ? e.target.value : setMaxPrice(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Location</label>
                    <input type="text" placeholder="City or State" value={location} onChange={e => setLocation(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Min Rating</label>
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setMinRating(s === minRating ? 0 : s)} className="p-0.5">
                          <FiStar className={`w-3.5 h-3.5 ${s <= minRating ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleApplyFilters}
                    className="w-full py-2 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/20">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Guest promo banner */}
          {!isLoggedIn && !collapsed && (
            <div className="mx-3 mt-4 p-4 bg-linear-to-br from-orange-500 to-green-500 rounded-2xl text-white text-center shadow-lg">
              <p className="font-bold text-sm mb-1">Start Shopping!</p>
              <p className="text-[11px] text-white/80 mb-3">Create an account or login to place orders</p>
              <Link href="/register" className="block w-full py-2 bg-white text-orange-600 font-bold text-xs rounded-lg hover:bg-orange-50 transition">Create Account</Link>
              <Link href="/login" className="block w-full mt-2 py-2 bg-white/20 text-white font-semibold text-xs rounded-lg hover:bg-white/30 transition">Login</Link>
            </div>
          )}

          {isLoggedIn && (
            <div className="mx-3 mt-4">
              <Link href="/dashboard/customer/wishlist" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600 transition ${collapsed ? "lg:justify-center" : ""}`}>
                <FiPackage className="text-xl shrink-0"/>
                <span className={`text-sm font-medium whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>My Dashboard</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="p-3">
          {isLoggedIn ? (
            <Link href="/dashboard/customer" className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-linear-to-r from-green-500 to-orange-500 text-white hover:opacity-90 transition ${collapsed ? "lg:justify-center" : ""}`}>
              <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className={`flex flex-col transition-all duration-300 ${collapsed ? "lg:hidden" : ""}`}>
                <span className="text-xs font-bold">{user?.firstName} {user?.lastName}</span>
                <span className="text-[10px] text-white/70">My Dashboard →</span>
              </div>
            </Link>
          ) : (
            <Link href="/login" className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-xs bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold hover:shadow-lg hover:scale-[1.01] transition-all ${collapsed ? "lg:justify-center" : "justify-center"}`}>
              <FiLogIn className="shrink-0"/>
              <span className={`whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>Login / Register</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <main className={`flex-1 transition-all duration-300 overflow-x-hidden pt-16 lg:pt-14 ${collapsed ? "lg:ml-[60px]" : "lg:ml-58"}`}>
        <div className="p-4">

          {/* ── Academic Project Banner ── */}
          <div className="w-full bg-linear-to-r from-orange-500 to-green-600 text-white text-center py-3 px-4 rounded-xl md:rounded-2xl mb-6 font-extrabold text-[10px] md:text-sm shadow-md tracking-wider border border-white/20">
            PROJECT: DESIGN AND IMPLEMENTATION OF A MULTI-VENDOR E-COMMERCE PLATFORM FOR LOCAL SMEs
          </div>

          {/* ── Hero Carousel ── */}
          <div className="relative h-[340px] md:h-[420px] w-full rounded-2xl md:rounded-3xl overflow-hidden mb-10 group">
            {heroSlides.map((deal, i) => (
              <div key={deal.id} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <Image src={deal.img} alt={deal.title} fill priority={i === 0} className="object-cover" sizes="(max-width:1280px) 100vw, 1200px"/>
                <div className={`absolute inset-0 ${deal.overlay}`}/>
              </div>
            ))}
            <div className="relative h-full flex flex-col justify-between p-6 md:p-10 z-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="text-xs">{heroSlides[slide].badgeIcon}</span>
                  <span className="text-white text-xs font-semibold">{heroSlides[slide].badge}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight">{heroSlides[slide].title}</h1>
                <p className="text-xs md:text-sm text-white/90 mb-5 max-w-md">{heroSlides[slide].subtitle}</p>
                <button
                  onClick={() => { const el = document.getElementById("products"); el && el.scrollIntoView({ behavior: "smooth" }); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 rounded-xl font-bold shadow-xl hover:scale-105 transition-all text-sm"
                >
                  {heroSlides[slide].btn} <FiArrowRight/>
                </button>
              </div>

              {/* Search bar in hero */}
              <div className="w-full max-w-xl">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center bg-white rounded-xl shadow-2xl overflow-hidden">
                    <div className="pl-4 text-gray-400 hidden sm:flex"><FiSearch className="w-5 h-5"/></div>
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search for products, brands, categories..." className="flex-1 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"/>
                    <button type="submit" className="px-5 py-2.5 mr-1.5 bg-orange-500 text-white font-bold rounded-lg text-xs hover:bg-orange-600 transition flex items-center gap-1.5">
                      <FiSearch className="w-4 h-4"/><span className="hidden sm:inline">Search</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Prev/Next */}
            <button onClick={() => setSlide(p => (p - 1 + heroSlides.length) % heroSlides.length)} className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 p-3 bg-white/25 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition opacity-0 group-hover:opacity-100 z-10"><FiChevronLeft className="w-5 h-5"/></button>
            <button onClick={() => setSlide(p => (p + 1) % heroSlides.length)} className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 p-3 bg-white/25 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition opacity-0 group-hover:opacity-100 z-10"><FiChevronRight className="w-5 h-5"/></button>

            {/* Dots */}
            <div className="absolute bottom-6 left-10 flex gap-2 z-10">
              {heroSlides.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-2 bg-white/50"}`}/>
              ))}
            </div>
          </div>

          {/* ── Not-logged-in banner ── */}
          {!isLoggedIn && (
            <div className="mb-10 p-5 md:p-6 rounded-2xl bg-linear-to-r from-orange-500 via-orange-400 to-green-500 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="text-white text-center sm:text-left">
                <p className="font-extrabold text-lg md:text-xl">Ready to start shopping?</p>
                <p className="text-white/85 text-sm">Create a free account to add items to cart, track orders and get exclusive deals.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/register" className="px-5 py-2.5 bg-white text-orange-600 font-bold text-sm rounded-xl hover:bg-orange-50 transition shadow whitespace-nowrap">Create Account</Link>
                <Link href="/login"    className="px-5 py-2.5 bg-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/30 transition whitespace-nowrap">Login</Link>
              </div>
            </div>
          )}

          {/* ── Categories ── */}
          <div id="categories" className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">Shop by Category</h2>
              <Link href="/dashboard/customer/categories" className="text-orange-500 hover:text-orange-600 font-semibold text-sm flex items-center gap-1">View All <FiArrowRight className="w-4 h-4"/></Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"/>)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat, i) => {
                  const s = catStyles[i % catStyles.length];
                  return (
                    <Link key={cat._id} href={`/dashboard/customer/categories/${cat._id}`}
                      className="group relative h-36 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                      <img src={s.bg} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                      <div className={`absolute inset-0 bg-linear-to-br ${s.gradient}`}/>
                      <div className="relative h-full flex flex-col justify-between p-4">
                        <div className="self-end">
                          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">{s.icon}</div>
                        </div>
                        <div className="text-white">
                          <h3 className="text-sm font-bold mb-0.5">{cat.name}</h3>
                          <p className="text-xs text-white/80 flex items-center gap-1">{cat.product_count || 0}+ products <FiArrowRight className="group-hover:translate-x-1 transition-transform"/></p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Featured / Search Results Section ── */}
          <div id="products" className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">
                  {isFiltering ? "Search Results" : "Featured Products"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {isFiltering
                    ? `Showing ${displayProducts.length} items for your criteria`
                    : "Handpicked just for you"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm lg:hidden"
                >
                  <FiFilter className={appliedFilters.active ? "text-orange-500" : ""} />
                  Filters
                  {appliedFilters.active && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                </button>
                {!isFiltering && (
                  <Link href="/dashboard/customer" className="text-orange-500 hover:text-orange-600 font-semibold text-sm flex items-center gap-1">
                    View All <FiArrowRight className="w-4 h-4"/>
                  </Link>
                )}
                {isFiltering && (
                  <button
                    onClick={handleClearFilters}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-semibold text-xs md:text-sm flex items-center gap-1"
                  >
                    <FiX className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Desktop Filter Sidebar removed from here to global sidebar */}

              {/* Mobile Filter Drawer logic stays same */}
              {showFilters && (
                <div className="fixed inset-0 z-60 lg:hidden">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
                  <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 rounded-t-3xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold dark:text-white">Filters</h3>
                      <button onClick={() => setShowFilters(false)} className="dark:text-white"><FiX className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-6 mb-8">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Price Range</label>
                        <div className="flex gap-3">
                          <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl outline-none" />
                          <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Location</label>
                        <input type="text" placeholder="City or State" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Min Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setMinRating(s === minRating ? 0 : s)} className="p-2">
                              <FiStar className={`w-6 h-6 ${s <= minRating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={handleClearFilters} className="flex-1 py-4 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl font-bold text-sm">Clear All</button>
                      <button onClick={handleApplyFilters} className="flex-2 py-4 bg-orange-500 text-white rounded-xl font-bold text-sm">Apply Filters</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid content starts: Loading states */}
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"/>)}
                </>
              ) : displayProducts.length === 0 ? (
                <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiSearch className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No matching products</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto mb-6">Try adjusting your filters or search keywords to find what you're looking for.</p>
                  <button onClick={handleClearFilters} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-orange-200 transition-all">Clear All Filters</button>
                </div>
              ) : (
                <>
                  {displayProducts.map((product) => {
                    const img = product.images?.[0];
                    const hasDiscount = isDiscountActive(product);
                    const discPrice = getDiscounted(product);
                    const ratingData = ratings[product._id];
                    const hasRating = ratingData && ratingData.count > 0;
                    const isAdding = addingCart[product._id];
                    const isToggling = togWishlist[product._id];
                    const inWishlist = wishlist.has(product._id);

                    return (
                      <div key={product._id} className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800">
                        <div className="relative bg-orange-50 dark:bg-gray-800 h-44">
                          {img
                            ? <img src={img} alt={product.name} className="w-full h-full object-cover rounded-t-xl group-hover:scale-105 transition-transform duration-500"/>
                            : <div className="w-full h-full flex items-center justify-center"><FiPackage className="text-gray-300 dark:text-gray-600 text-4xl"/></div>
                          }
                          <div className="absolute top-3 left-2.5 flex flex-col gap-1.5 items-start">
                            {hasDiscount && <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow">-{product.discountPercentage}% OFF</span>}
                            {product.activeSlashId && <span className="bg-orange-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow">🔥 Group Buy</span>}
                            {product.hasActivePowerHour && <span className="bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-full shadow">⚡ Power Hour</span>}
                          </div>
                          <button
                            onClick={() => handleToggleWishlist(product._id, product.name)}
                            disabled={isToggling}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md"
                          >
                            {isToggling ? <FiX className="animate-spin text-orange-500 text-xs" /> : <FiHeart className={`${inWishlist && isLoggedIn ? "text-red-500 fill-current" : "text-gray-600 dark:text-gray-300"}`}/>}
                          </button>
                        </div>
                        <div className="p-3">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{product.category?.name || "Uncategorized"}</span>
                          <Link href={isLoggedIn ? `/dashboard/customer/products/${product._id}` : `/login`}><h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5 mt-1 line-clamp-1 hover:text-orange-500 transition cursor-pointer">{sentenceCase(product.name)}</h3></Link>
                          <p className="text-[10px] text-gray-400 mb-1">by {product.vendor?.businessName || "Local Vendor"}</p>
                          <div className="flex items-center gap-1 mb-2">
                            {hasRating ? (
                              <>
                                <FiStar className="text-yellow-400 text-xs fill-current"/><span className="text-xs font-bold text-gray-900 dark:text-white">{ratingData.average.toFixed(1)}</span>
                                <span className="text-[9px] text-gray-500">({ratingData.count} {ratingData.count === 1 ? "review" : "reviews"})</span>
                              </>
                            ) : <span className="text-[9px] text-gray-400 italic">No reviews</span>}
                          </div>
                          <div className="flex items-center gap-1 mb-2 text-gray-500">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            <span className="text-[10px]">{product.vendor?.city || "Nigeria"}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base font-bold text-gray-900 dark:text-white">{fmt(discPrice)}</span>
                            {hasDiscount && <span className="text-xs text-gray-400 line-through">{fmt(product.price)}</span>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAddToCart(product)} disabled={isAdding} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition-colors">
                              {isAdding ? "Adding..." : "Add to Cart"}
                            </button>
                            <Link href={isLoggedIn ? `/dashboard/customer/products/${product._id}` : "/login"} className="px-2.5 py-2 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition flex items-center justify-center"><FiEye className="w-3 h-3"/></Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Footer strip ── */}
          <div className="mt-6 py-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span>© {new Date().getFullYear()} AfriCart — Your Nigerian Marketplace</span>
            <div className="flex items-center gap-4">
              <Link href="/login"    className="hover:text-orange-500 transition">Login</Link>
              <Link href="/register" className="hover:text-orange-500 transition">Register</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
