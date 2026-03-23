"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RiShoppingCart2Line } from "react-icons/ri";
import CustomerOffersNotification from "@/components/CustomerOffersNotification";
import CustomerNotificationDropdown from "@/components/CustomerNotificationDropdown";
import { useSync } from "@/contexts/SyncContext";
import {
  FiHome,
  FiPackage,
  FiHeart,
  FiUser,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiSearch,
  FiMessageSquare,
  FiTag,
  FiFilter,
  FiStar,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
} from "react-icons/tb";
import LanguageSelector from "@/components/LanguageSelector";

export default function CustomerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerSearchTerm, setHeaderSearchTerm] = useState("");
  const { counts } = useSync();

  // Filter state (lives here so it persists across sidebar interactions)
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filtersApplied, setFiltersApplied] = useState(false);

  const handleSidebarApplyFilters = () => {
    setFiltersApplied(true);
    // Dispatch a custom event the page can listen to
    window.dispatchEvent(new CustomEvent("applyFilters", {
      detail: { minPrice: filterMinPrice, maxPrice: filterMaxPrice, location: filterLocation, minRating: filterMinRating }
    }));
  };

  const handleSidebarClearFilters = () => {
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterLocation("");
    setFilterMinRating(0);
    setFiltersApplied(false);
    window.dispatchEvent(new CustomEvent("clearFilters"));
  };

  const hideSearchOn = [
    "/dashboard/customer/cart",
    "/dashboard/customer/checkout",
    "/dashboard/customer/settings",
  ];
  const isSearchHidden = hideSearchOn.includes(pathname);

  const getUserInitials = () => {
    if (!user?.firstName) return "U";
    const firstInitial = user.firstName.charAt(0).toUpperCase();
    const lastInitial = user.lastName?.charAt(0).toUpperCase() || "";
    return firstInitial + lastInitial;
  };

  const initials = getUserInitials();



  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // Fetch user profile
        const response = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error("Please log in");
          router.push("/login");
          return;
        }

        // Check role
        if (data.user.role !== "CUSTOMER") {
          toast.error("Access denied. Customers only.");
          router.push("/");
          return;
        }

        setUser({
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone,
          role: data.user.role,
          profilePicture: data.user.profilePicture,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Session expired. Please log in again.");
        router.push("/login");
      }
    };

    checkUser();

    const handleProfileUpdate = () => { checkUser(); };
    if (typeof window !== 'undefined') {
      window.addEventListener("profileUpdated", handleProfileUpdate);
      return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
    }
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setShowHeaderSearch(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);

    const onClearFilters = () => {
      setFilterMinPrice("");
      setFilterMaxPrice("");
      setFilterLocation("");
      setFilterMinRating(0);
      setFiltersApplied(false);
    };

    window.addEventListener("clearFilters", onClearFilters);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("clearFilters", onClearFilters);
    };
  }, []);

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    if (headerSearchTerm.trim()) {
      router.push(`/dashboard/customer/search?search=${encodeURIComponent(headerSearchTerm)}`);
      setHeaderSearchTerm("");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("authToken");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const navigation = [
    { name: "Home", href: "/dashboard/customer", icon: FiHome },
    { name: "Chats", href: "/dashboard/customer/chat", icon: FiMessageSquare },
    { name: "My Offers", href: "/dashboard/customer/offers", icon: FiTag },
    { name: "My Orders", href: "/dashboard/customer/orders", icon: FiPackage },
    { name: "Profile", href: "/dashboard/customer/profile", icon: FiUser },
    { name: "Wishlist", href: "/dashboard/customer/wishlist", icon: FiHeart },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 w-full flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="text-2xl text-gray-900 dark:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {mobileSidebarOpen ? <FiX /> : <FiMenu />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden border-2 border-white dark:border-gray-700">
              {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 dark:text-white text-[13px] leading-tight">
                {user?.firstName || "Customer"}
              </span>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Dashboard</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <div className="flex items-center gap-2">
            <CustomerNotificationDropdown />
              <Link
                href="/dashboard/customer/cart"
                className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-orange-500 group transition-all duration-200"
              >
                <RiShoppingCart2Line className="text-lg text-gray-900 dark:text-gray-200 cursor-pointer group-hover:text-white" />
                {counts.cart > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {counts.cart > 99 ? "99+" : counts.cart}
                  </span>
                )}
              </Link>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sticky Search Bar */}
      <div
        className={`lg:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b shadow-sm z-30 transition-all duration-300 ${
          showHeaderSearch && !isSearchHidden
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-3">
          <form onSubmit={handleHeaderSearch}>
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="pl-3 text-gray-400 dark:text-gray-500">
                <FiSearch size={16} />
              </div>
              <input
                type="text"
                value={headerSearchTerm}
                onChange={(e) => setHeaderSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none placeholder-gray-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors mr-1"
              >
                <FiSearch size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div
        className="hidden lg:block fixed top-0 right-0 h-13 bg-white dark:bg-gray-900 border-b border-gray-200 z-20 transition-all duration-300"
        style={{
          left: sidebarCollapsed ? "60px" : "232px",
          width: sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 232px)",
        }}
      >
        <div className="h-full flex items-center justify-between px-4 gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="outline-none focus:outline-none cursor-pointer p-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-orange-500 group transition-all duration-200 shrink-0"
          >
            {sidebarCollapsed ? (
              <TbLayoutSidebarLeftCollapse className="text-gray-900 dark:text-gray-200 text-xl group-hover:text-white" />
            ) : (
              <TbLayoutSidebarLeftExpand className="text-gray-900 dark:text-gray-200 text-xl group-hover:text-white" />
            )}
          </button>

          {/* Desktop Search Bar */}
          <div
            className={`flex-1 max-w-2xl transition-all duration-300 ${
              showHeaderSearch && !isSearchHidden
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            <form onSubmit={handleHeaderSearch} className="w-full">
              <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-colors">
                <div className="pl-3 text-gray-400 dark:text-gray-500">
                  <FiSearch size={16} />
                </div>
                <input
                  type="text"
                  value={headerSearchTerm}
                  onChange={(e) => setHeaderSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 px-3 py-2.5 text-xs text-gray-900 dark:text-white bg-transparent focus:outline-none placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-orange-500 text-white rounded-[11px] hover:bg-orange-600 transition-colors mr-0.5"
                >
                  <FiSearch size={16} />
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSelector />
            <div className="flex items-center gap-2">
              <CustomerNotificationDropdown />
              <Link
                href="/dashboard/customer/cart"
                className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-orange-500 group transition-all duration-200"
              >
                <RiShoppingCart2Line className="text-lg text-gray-900 dark:text-gray-200 cursor-pointer group-hover:text-white" />
                {counts.cart > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {counts.cart > 99 ? "99+" : counts.cart}
                  </span>
                )}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-37.5">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate max-w-37.5">
                  {user?.email}
                </span>
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-200">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-green-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 transition-all duration-300 flex flex-col justify-between z-40 overflow-y-auto scrollbar-thin
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-15" : "lg:w-58"}
          w-64
        `}
      >
        <div>
          <div
            className={`h-13 flex items-center border-b border-gray-200 gap-3 transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "px-4"}`}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-orange-600 rounded-xl flex text-sm items-center justify-center text-white font-bold shrink-0 overflow-hidden">
              {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" /> : initials}
            </div>
            <span
              className={`font-bold text-gray-900 dark:text-white text-base whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              {user?.firstName || "Customer"}
            </span>
          </div>

          <nav className="mt-4 px-2 flex flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isActive ? "bg-green-100 text-green-700" : "text-slate-900 dark:text-gray-200 hover:bg-gray-100"}
                    ${sidebarCollapsed ? "lg:justify-center" : ""}
                  `}
                >
                  <Icon className="text-xl shrink-0" />
                  <span
                    className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Filter Panel – visible on home page and search page, full sidebar */}
          {(pathname === "/dashboard/customer" || pathname === "/dashboard/customer/search") && !sidebarCollapsed && (
            <div className="mt-6 px-3">
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FiFilter className="text-xs" /> Filters
                  </span>
                  {filtersApplied && (
                    <button onClick={handleSidebarClearFilters} className="text-[10px] text-orange-500 hover:underline">Clear</button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Price</label>
                    <div className="flex gap-2 mt-1.5">
                      <input type="number" placeholder="Min" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                      <input type="number" placeholder="Max" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Location</label>
                    <input type="text" placeholder="City or State" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-orange-500 dark:text-white" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Min Rating</label>
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setFilterMinRating(s === filterMinRating ? 0 : s)} className="p-0.5">
                          <FiStar className={`w-3.5 h-3.5 ${s <= filterMinRating ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleSidebarApplyFilters}
                    className="w-full py-2 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 transition-all active:scale-95">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed filter icon hint */}
          {pathname === "/dashboard/customer" && sidebarCollapsed && (
            <div className="px-2 mt-4">
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand to use filters"
                className="w-full flex justify-center p-2.5 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-gray-800 transition-all"
              >
                <FiFilter className="text-base" />
              </button>
            </div>
          )}
        </div>

        <div className="p-3">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 ${sidebarCollapsed ? "lg:justify-center" : ""}`}
          >
            <FiLogOut className="text-xl shrink-0" />
            <span
              className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`
        flex-1 transition-all duration-300 overflow-x-hidden
        pt-16
        lg:pt-12
        ${sidebarCollapsed ? "lg:ml-15" : "lg:ml-58"}
      `}
      >
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
