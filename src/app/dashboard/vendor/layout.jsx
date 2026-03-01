"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBusinessInitials } from "@/lib/utils/getbusinessinitials";
import { RiShoppingCart2Line } from "react-icons/ri";
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiMessageSquare,
  FiTag,
  FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Image from "next/image";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from "react-icons/tb";
import LanguageSelector from "@/components/LanguageSelector";

export default function VendorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const initials = getBusinessInitials(vendor?.businessName);

  useEffect(() => {
    const checkUser = async () => {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // Decode token to check role
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        if (!decoded || decoded.role !== 'VENDOR') {
          toast.error("Access denied. Vendors only.");
          localStorage.removeItem('authToken');
          router.push("/login");
          return;
        }

        // Fetch user profile from MongoDB
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        
        if (data.success) {
          setUser(data.user);
          setVendor(data.vendor);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const navigation = [
    { name: "Overview", href: "/dashboard/vendor", icon: FiHome },
    { name: "Products", href: "/dashboard/vendor/products", icon: FiPackage },
    { name: "Orders", href: "/dashboard/vendor/orders", icon: FiShoppingBag },
    { name: "Analytics", href: "/dashboard/vendor/analytics", icon: FiBarChart2 },
    { name: "Chats", href: "/dashboard/vendor/chats", icon: FiMessageSquare },
    { name: "Offers", href: "/dashboard/vendor/offers", icon: FiTag },
    { name: "Profile", href: "/dashboard/vendor/profile", icon: FiUser },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 w-full flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b flex items-center justify-between px-4 z-50">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="text-2xl text-black"
        >
          {mobileSidebarOpen ? <FiX /> : <FiMenu />}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-green-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <span className="font-bold text-black text-sm">
            {vendor?.businessName || "Vendor"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gray-300 hover:bg-purple-600 group transition-colors duration-200">
              <FiBell className="text-base text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-white" />
            </div>
            <div className="p-2 rounded-xl bg-gray-300 hover:bg-purple-600 group transition-colors duration-200">
              <RiShoppingCart2Line className="text-base text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-white" />
            </div>
          </div>
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-200">
            {vendor?.logoUrl ? (
              <Image
                src={vendor.logoUrl}
                alt={vendor.businessName || "Vendor"}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            )}
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

      {/* Desktop Top Bar */}
      <div
        className="hidden lg:block fixed top-0 right-0 h-13 bg-white dark:bg-gray-900 border-b border-gray-200 z-10 transition-all duration-300"
        style={{
          left: sidebarCollapsed ? "60px" : "232px",
          width: sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 232px)",
        }}
      >
        <div className="h-full flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-2xl outline-none focus:outline-none cursor-pointer p-2 rounded-xl bg-gray-300 hover:bg-purple-600 group transition-colors duration-200"
          >
            {sidebarCollapsed ? (
              <TbLayoutSidebarLeftCollapse className="text-gray-700 dark:text-gray-300 text-xl group-hover:text-white" />
            ) : (
              <TbLayoutSidebarLeftExpand className="text-gray-700 dark:text-gray-300 text-xl group-hover:text-white" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gray-300 hover:bg-purple-600 group transition-colors duration-200">
                <FiBell className="text-base text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-white" />
              </div>
              <div className="p-2 rounded-xl bg-gray-300 hover:bg-purple-600 group transition-colors duration-200">
                <RiShoppingCart2Line className="text-base text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-white" />
              </div>
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
                {vendor?.logoUrl ? (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.businessName || "Vendor"}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
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
          fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 transition-all duration-300 flex flex-col justify-between z-40
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-15" : "lg:w-58"}
          w-64
        `}
      >
        {/* Sidebar Header */}
        <div>
          <div
            className={`h-13 flex items-center border-b border-gray-200 gap-3 transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "px-4"}`}
          >
            <div className="w-9 h-9 bg-linear-to-br from-green-600 to-orange-600 rounded-xl flex text-sm items-center justify-center text-white font-bold shrink-0">
              {initials}
            </div>
            <span
              className={`font-bold text-black text-base whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}
            >
              {vendor?.businessName || "Vendor"}
            </span>
          </div>

          {/* Navigation */}
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
                    ${
                      isActive
                        ? "bg-orange-100 text-orange-600"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    }
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
        </div>

        {/* Logout Button */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200
              ${sidebarCollapsed ? "lg:justify-center" : ""}
            `}
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
        flex-1 transition-all duration-300
        pt-16
        lg:pt-13
        ${sidebarCollapsed ? "lg:ml-15" : "lg:ml-58 overflow-hidden"}
      `}
      >
        <div className="p-4 py-8">{children}</div>
      </main>
    </div>
  );
}