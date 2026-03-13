"use client";

import React, { useState, useEffect } from "react";
import { 
  FiUser, FiMail, FiPhone, FiLock, FiSave, FiMapPin, FiCamera, FiSettings, FiBell, FiShield, FiGlobe, FiLogOut, FiMoon
} from "react-icons/fi";
import toast from "react-hot-toast";

const Toggle = ({ enabled, onChange }) => (
  <button 
    onClick={(e) => { e.preventDefault(); onChange(!enabled); }}
    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
      enabled ? 'bg-orange-500' : 'bg-gray-200'
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-gray-900 transition duration-200 ease-in-out shadow-sm ${
      enabled ? 'translate-x-[22px]' : 'translate-x-1'
    }`} />
  </button>
);

export default function CustomerSettingsAndProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    state: "",
    city: "",
    deliveryAddress: "",
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, ...data.profile }));
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
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
      const response = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Profile saved successfully!");
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event("profileUpdated"));
        }
      }
      else toast.error(data.message || "Failed to update profile");
    } catch {
      toast.error("Error saving profile");
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "My Profile", icon: FiUser },
    { id: "settings", label: "App Settings", icon: FiSettings },
    { id: "security", label: "Security & Passwords", icon: FiShield },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Account & Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Manage your details, preferences, and privacy.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row min-h-[650px] overflow-hidden">
        
        {/* Simple Sidebar Menu */}
        <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 p-4 shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? "bg-white dark:bg-gray-900 text-orange-600 shadow-sm border border-gray-100 dark:border-gray-800" 
                    : "text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 dark:text-white"
                  }
                `}
              >
                <tab.icon className={`text-lg ${isActive ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`} />
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
                  <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-3xl font-bold text-orange-600 border-2 border-white dark:border-gray-900 shadow-sm overflow-hidden">
                    {formData.profilePicture ? (
                      <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <>{formData.firstName?.[0]}{formData.lastName?.[0]}</>
                    )}
                  </div>
                  <label className="cursor-pointer absolute bottom-0 right-0 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:text-orange-600 shadow-sm">
                    <FiCamera size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{formData.firstName} {formData.lastName}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-1"><FiMail /> {formData.email}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
                      <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Street Address</label>
                      <textarea name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} rows="2" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"></textarea>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-70">
                    <FiSave /> {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === "settings" && (
            <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Application Preferences</h2>
              
              <form onSubmit={handleSettingsSave} className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiBell className="text-orange-500" /> Notifications</h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Email Receipts</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Receive order confirmations via email</p>
                      </div>
                      <Toggle enabled={settings.emailAlerts} onChange={() => handleToggle('emailAlerts')} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">SMS Updates</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Text messages for delivery tracking</p>
                      </div>
                      <Toggle enabled={settings.smsAlerts} onChange={() => handleToggle('smsAlerts')} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Promotional Offers</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Sales, discounts, and new products</p>
                      </div>
                      <Toggle enabled={settings.promotions} onChange={() => handleToggle('promotions')} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiMoon className="text-orange-500" /> Appearance</h3>
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
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiGlobe className="text-orange-500" /> Localization</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Currency Display</label>
                      <select value={settings.currency} onChange={(e) => setSettings({...settings, currency: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                        <option value="NGN">Naira (₦)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-70">
                    <FiSave /> {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY VIEW */}
          {activeTab === "security" && (
            <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Security & Privacy</h2>
              
              <form onSubmit={handlePasswordSave} className="space-y-6 mb-10">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-2 flex items-center gap-2"><FiLock className="text-gray-400 dark:text-gray-500" /> Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                    <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full md:max-w-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-colors">
                  Update Password
                </button>
              </form>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
                <button type="button" className="px-4 py-2 bg-white dark:bg-gray-900 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
