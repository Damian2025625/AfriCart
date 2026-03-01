"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiShoppingBag,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiPackage,
  FiShield,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from "react-icons/tb";
import toast from "react-hot-toast";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        if (!decoded || decoded.role !== "ADMIN") {
          toast.error("Access denied. Admins only.");
          localStorage.removeItem("authToken");
          router.push("/login");
          return;
        }
        const response = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        console.error("Admin auth check error:", error);
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("authToken");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const navigation = [
    { name: "Overview", href: "/dashboard/admin", icon: FiHome },
    { name: "Vendors", href: "/dashboard/admin/vendors", icon: FiShoppingBag },
    { name: "Customers", href: "/dashboard/admin/customers", icon: FiUsers },
    { name: "Orders", href: "/dashboard/admin/orders", icon: FiPackage },
    { name: "Payments", href: "/dashboard/admin/payments", icon: FiDollarSign },
    { name: "Disputes", href: "/dashboard/admin/disputes", icon: FiAlertCircle },
    { name: "Analytics", href: "/dashboard/admin/analytics", icon: FiBarChart2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b flex items-center justify-between px-4 z-50 shadow-sm">
        <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="text-2xl text-gray-700">
          {mobileSidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center">
            <FiShield className="text-white text-sm" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Desktop Top Bar */}
      <div
        className="hidden lg:block fixed top-0 right-0 h-13 bg-white border-b z-10 transition-all duration-300 shadow-sm"
        style={{
          left: sidebarCollapsed ? "60px" : "232px",
          width: sidebarCollapsed ? "calc(100% - 60px)" : "calc(100% - 232px)",
        }}
      >
        <div className="h-full flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-2xl outline-none cursor-pointer p-2 rounded-xl bg-gray-100 hover:bg-purple-100 group transition-colors duration-200"
          >
            {sidebarCollapsed ? (
              <TbLayoutSidebarLeftCollapse className="text-gray-600 text-xl group-hover:text-purple-600" />
            ) : (
              <TbLayoutSidebarLeftExpand className="text-gray-600 text-xl group-hover:text-purple-600" />
            )}
          </button>

          <div className="flex items-center gap-4">
            {/* Admin Badge */}
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
              <FiShield className="text-xs" />
              Administrator
            </span>
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[10px] text-gray-500">{user?.email}</span>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-purple-200">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white border-r transition-all duration-300 flex flex-col justify-between z-40 shadow-sm
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-15" : "lg:w-58"}
          w-64
        `}
      >
        {/* Sidebar Header */}
        <div>
          <div className={`h-13 flex items-center border-b gap-3 transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "px-4"}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0">
              <FiShield className="text-white text-base" />
            </div>
            <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className="font-bold text-gray-900 text-sm">AfricArt</p>
              <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide">Admin Panel</p>
            </div>
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
                    ${isActive ? "bg-purple-100 text-purple-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                    ${sidebarCollapsed ? "lg:justify-center" : ""}
                  `}
                >
                  <Icon className="text-xl shrink-0" />
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 ${sidebarCollapsed ? "lg:justify-center" : ""}`}
          >
            <FiLogOut className="text-xl shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 pt-16 lg:pt-13 ${sidebarCollapsed ? "lg:ml-15" : "lg:ml-58"}`}
      >
        <div className="p-4 py-8">{children}</div>
      </main>
    </div>
  );
}
