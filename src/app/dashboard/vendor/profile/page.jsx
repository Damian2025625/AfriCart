"use client";

import React, { useState, useEffect } from "react";
import { 
  FiUser, FiMail, FiPhone, FiLock, FiSave, FiMapPin, FiCamera, FiSettings, FiBell, FiShield, FiGlobe, FiLogOut, FiCreditCard, FiMoon
} from "react-icons/fi";
import toast from "react-hot-toast";

const Toggle = ({ enabled, onChange }) => (
  <button 
    onClick={(e) => { e.preventDefault(); onChange(!enabled); }}
    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
      enabled ? 'bg-purple-600' : 'bg-gray-200'
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-gray-900 transition duration-200 ease-in-out shadow-sm ${
      enabled ? 'translate-x-[22px]' : 'translate-x-1'
    }`} />
  </button>
);

export default function VendorSettingsAndProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    businessPhone: "",
    country: "",
    state: "",
    city: "",
    profilePicture: null,
  });

  // Security State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Settings State 
  const [settings, setSettings] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    orderUpdates: true,
    promotions: false,
    publicProfile: true,
    twoFactorAuth: false,
    darkMode: false,
    currency: "NGN",
  });

  // Finance State
  const [financeData, setFinanceData] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    bankCode: "",
    hasSubaccount: false
  });
  const [banks, setBanks] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchBanks();
    fetchFinanceData();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await fetch("https://api.paystack.co/bank?currency=NGN");
      const result = await response.json();
      if (result.status) {
        // Paystack sometimes returns duplicate bank entries, filter them by code
        const uniqueBanks = Array.from(new Map(result.data.map(item => [item.code, item])).values());
        setBanks(uniqueBanks);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const fetchFinanceData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/paystack/vendor/subaccount", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.data) {
        setFinanceData(prev => ({
          ...prev,
          bankName: data.data.bankAccount?.bankName || "",
          accountNumber: data.data.bankAccount?.accountNumber || "",
          accountName: data.data.bankAccount?.accountName || "",
          bankCode: data.data.bankAccount?.bankCode || "",
          hasSubaccount: data.data.hasSubaccount || false
        }));
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ 
          ...prev, 
          ...data.user,
          businessName: data.vendor?.businessName || "",
          businessDescription: data.vendor?.description || "",
          businessAddress: data.vendor?.businessAddress || "",
          businessPhone: data.vendor?.businessPhone || "",
          profilePicture: data.user?.profilePicture || null,
        }));
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  const handleFinanceChange = (e) => {
    const { name, value } = e.target;
    if (name === "bankCode") {
      const selectedBank = banks.find(b => b.code === value);
      setFinanceData({ ...financeData, bankCode: value, bankName: selectedBank ? selectedBank.name : "" });
    } else {
      setFinanceData({ ...financeData, [name]: value });
    }
  };
  const handleToggle = (key) => setSettings(prev => {
    const newVal = !prev[key];
    if (key === 'darkMode') {
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
    return { ...prev, [key]: newVal };
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
      if (file.size > 2 * 1024 * 1024) return toast.error('Image size must be less than 2MB');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Vendor profile saved successfully!");
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event("profileUpdated"));
        }
      }
      else toast.error(data.message || "Failed to update profile");
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error("New passwords do not match");
    if (passwordData.newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password updated!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else toast.error(data.message || "Failed to update password");
    } catch {
      toast.error("Error changing password");
    } finally {
      setSaving(false);
    }
  };

  const handleFinanceSave = async (e) => {
    e.preventDefault();
    if (!financeData.bankCode || !financeData.accountNumber) {
      return toast.error("Please provide Bank and Account Number");
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      const endpoint = "/api/paystack/vendor/subaccount";
      const method = financeData.hasSubaccount ? "PUT" : "POST";
      const payload = {
        accountNumber: financeData.accountNumber,
        bankCode: financeData.bankCode,
        businessName: formData.businessName || "AfricArt Vendor",
        email: formData.email,
        phone: formData.phone || formData.businessPhone || "0000000000",
        accountName: financeData.accountName || formData.firstName + " " + formData.lastName
      };
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(financeData.hasSubaccount ? "Payout information updated!" : "Payout account created successfully!");
        if (!financeData.hasSubaccount) {
          setFinanceData(prev => ({ ...prev, hasSubaccount: true }));
        }
      } else {
        toast.error(data.message || "Failed to save payout info");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Check input values or bank code.");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Preferences saved successfully!");
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Store Profile", icon: FiUser },
    { id: "finance", label: "Payouts & Tax", icon: FiCreditCard },
    { id: "settings", label: "Store Settings", icon: FiSettings },
    { id: "security", label: "Security & Passwords", icon: FiShield },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Store Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Manage your storefront, payouts, and preferences.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row min-h-[650px] overflow-hidden">
        
        {/* Simple Sidebar Menu */}
        <div id="profile-tabs" className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 p-4 shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? "bg-white dark:bg-gray-900 text-purple-700 shadow-sm border border-gray-100 dark:border-gray-800" 
                    : "text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 dark:text-white"
                  }
                `}
              >
                <tab.icon className={`text-lg ${isActive ? "text-purple-600" : "text-gray-400 dark:text-gray-500"}`} />
                {tab.label}
              </button>
            );
          })}
          
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700/50">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
              <FiLogOut className="text-lg" /> Log Out
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 p-6 md:p-8 bg-white dark:bg-gray-900">
          
          {/* PROFILE VIEW */}
          {activeTab === "profile" && (
            <div className="max-w-3xl animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-3xl font-bold text-purple-700 border-2 border-white dark:border-gray-900 shadow-sm overflow-hidden">
                    {formData.profilePicture ? (
                      <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      formData.businessName?.[0] || formData.firstName?.[0] || 'V'
                    )}
                  </div>
                  <label className="cursor-pointer absolute bottom-0 right-0 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:text-purple-600 shadow-sm">
                    <FiCamera size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{formData.businessName || "Your Store"}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-1"><FiUser /> {formData.firstName} {formData.lastName}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h3 id="profile-store-details" className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Store Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Business Name</label>
                        <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Business Phone</label>
                        <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Store Description</label>
                      <textarea name="businessDescription" value={formData.businessDescription} onChange={handleChange} rows="3" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"></textarea>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 transition-colors flex items-center gap-2 disabled:opacity-70">
                    <FiSave /> {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FINANCE VIEW */}
          {activeTab === "finance" && (
            <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payout Information</h2>
              
              <div className="relative w-full max-w-sm h-48 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white mb-8 overflow-hidden group hover:scale-[1.01] transition-transform shadow-lg">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent opacity-30"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Bank Name</p>
                      <p className="font-semibold text-lg tracking-wide">{financeData.bankName || "Your Bank"}</p>
                    </div>
                    <div className="w-10 h-7 bg-white dark:bg-gray-900/20 backdrop-blur-sm rounded-md flex items-center justify-center">
                      <FiCreditCard className="text-white/80" size={16} />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-xl tracking-[0.2em] mb-2 text-white/90">
                      {financeData.accountNumber ? `•••• •••• ${financeData.accountNumber.slice(-4)}` : "•••• •••• ••••"}
                    </p>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Account Name</p>
                        <p className="text-sm font-medium tracking-wide truncate max-w-[150px]">{financeData.accountName || "YOUR NAME"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleFinanceSave} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Bank Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bank Name</label>
                        <select name="bankCode" value={financeData.bankCode || ""} onChange={handleFinanceChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                          <option value="">Select Bank</option>
                          {banks.map(bank => (
                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Account Number</label>
                        <input type="text" name="accountNumber" value={financeData.accountNumber} onChange={handleFinanceChange} maxLength="10" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Account Name</label>
                      <input type="text" name="accountName" value={financeData.accountName} onChange={handleFinanceChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 transition-colors flex items-center gap-2 disabled:opacity-70">
                    <FiSave /> {saving ? "Saving..." : "Save Payout Info"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === "settings" && (
            <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Store Preferences</h2>
              
              <form onSubmit={handleSettingsSave} className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiBell className="text-purple-600" /> Notifications</h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">New Order Alerts</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Get notified instantly when you receive an order</p>
                      </div>
                      <Toggle enabled={settings.orderUpdates} onChange={() => handleToggle('orderUpdates')} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Low Stock Warnings</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Alerts when inventory falls below threshold</p>
                      </div>
                      <Toggle enabled={settings.emailAlerts} onChange={() => handleToggle('emailAlerts')} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">SMS Notifications</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Urgent alerts via text message</p>
                      </div>
                      <Toggle enabled={settings.smsAlerts} onChange={() => handleToggle('smsAlerts')} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiMoon className="text-purple-600" /> Appearance</h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Dark Mode</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Toggle dark theme for the dashboard</p>
                      </div>
                      <Toggle enabled={settings.darkMode} onChange={() => handleToggle('darkMode')} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiGlobe className="text-purple-600" /> Store Visibility</h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Store Active</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Temporarily hide your store from customers</p>
                      </div>
                      <Toggle enabled={settings.publicProfile} onChange={() => handleToggle('publicProfile')} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 transition-colors flex items-center gap-2 disabled:opacity-70">
                    <FiSave /> {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY VIEW */}
          {activeTab === "security" && (
            <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Security & Passwords</h2>
              
              <form onSubmit={handlePasswordSave} className="space-y-6 mb-10">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2 flex items-center gap-2"><FiLock className="text-gray-400 dark:text-gray-500" /> Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                    <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors">
                  Update Password
                </button>
              </form>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">Permanently delete your store. This action cannot be undone and you will lose all products and data.</p>
                <button type="button" className="px-4 py-2 bg-white dark:bg-gray-900 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  Delete Store
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
