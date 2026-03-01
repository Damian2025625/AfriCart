'use client'

import React from "react";
import { BsShop, BsBank } from "react-icons/bs";
import { FiUser, FiLock, FiMail, FiPhone, FiCreditCard } from "react-icons/fi";
import { useState, useEffect } from "react";
import Select from "react-select";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function VendorSignUp() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    state: "",
    city: "",
    shopName: "",
    categories: [],
    shopDescription: "",
    businessAddress: "",
    // ✅ NEW: Bank Account Fields
    accountName: "",
    accountNumber: "",
    bankName: "",
    bankCode: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    agreeToMarketing: false,
  });

  const [errors, setErrors] = useState({});
  const [data, setData] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

// ✅ Nigerian Banks & Fintechs
const nigerianBanks = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },

  // ✅ Fintechs
  { name: "OPay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Moniepoint Microfinance Bank", code: "50515" },

  { name: "Parallex Bank", code: "104" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "SunTrust Bank", code: "100" },
  { name: "Titan Trust Bank", code: "102" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];


  const bankOptions = nigerianBanks.map(bank => ({
    value: bank.code,
    label: bank.name,
    code: bank.code,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCategoryChange = (category) => {
    setFormData((prev) => {
      if (prev.categories.includes(category)) {
        return {
          ...prev,
          categories: prev.categories.filter((c) => c !== category),
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, category],
        };
      }
    });
    setErrors((prev) => ({ ...prev, categories: "" }));
  };

  const Validation = () => {
    const newErrors = {};
    
    // Personal Information
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim()))
      newErrors.email = "Invalid email format";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }
    if (!formData.country) newErrors.country = "Country is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.city) newErrors.city = "City is required";
    
    // Business Information
    if (!formData.shopName.trim()) newErrors.shopName = "Shop name is required";
    if (formData.categories.length === 0) newErrors.categories = "Select at least one category";
    if (!formData.shopDescription.trim())
      newErrors.shopDescription = "Shop description is required";
    if (!formData.businessAddress.trim()) newErrors.businessAddress = "Business address is required";
    
    // ✅ Bank Account Validation
    if (!formData.accountName.trim()) 
      newErrors.accountName = "Account name is required";
    if (!formData.accountNumber.trim()) 
      newErrors.accountNumber = "Account number is required";
    else if (!/^\d{10}$/.test(formData.accountNumber.trim()))
      newErrors.accountNumber = "Account number must be 10 digits";
    if (!formData.bankName) 
      newErrors.bankName = "Please select a bank";
    if (!formData.bankCode) 
      newErrors.bankCode = "Bank code is required";
    
    // Security
    if (!formData.password.trim()) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    fetch("/data/africa_data.json")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => {
        console.error("Error loading location data:", err);
        toast.error("Failed to load location data. Please refresh the page.");
      });
  }, []);

  const countryOptions = data.map((country) => ({
    value: country.name,
    label: country.name,
    states: country.states,
  }));

  const stateOptions =
    selectedCountry?.states?.map((st) => ({
      value: st.name,
      label: st.name,
      cities: st.cities,
    })) || [];

  const cityOptions =
    selectedState?.cities?.map((ct) => ({
      value: ct.name,
      label: ct.name,
    })) || [];

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '44px',
      borderColor: state.isFocused ? '#f97316' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(249, 115, 22, 0.1)' : 'none',
      '&:hover': {
        borderColor: '#f97316',
      },
      borderRadius: '8px',
      fontSize: '14px',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1f2937',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fed7aa' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      cursor: 'pointer',
      fontSize: '14px',
      '&:active': {
        backgroundColor: '#f97316',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: '#6b7280',
      fontSize: '14px',
    }),
    input: (base) => ({
      ...base,
      color: '#1f2937',
    }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Validation()) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'VENDOR',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Vendor Registration successful! Redirecting to login...`, {
          duration: 2000,
        });
        
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        toast.error(data.message || 'Registration failed', {
          position: "top-right",
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Network error. Please check your internet connection.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    "Fashion & Apparel",
    "Beauty & Personal Care",
    "Electronics & Gadgets",
    "Food & Beverages",
    "Agriculture & Farm Produce",
    "Health & Wellness",
    "Home & Furniture",
    "Arts, Crafts & Culture",
    "Books & Stationery",
    "Sports & Fitness",
    "Toys & Kids",
    "Automobile & Spare Parts",
    "Industrial & Construction",
    "Services",
    "Others / Miscellaneous",
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4 shadow-lg">
            <BsShop className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Start Selling on Africart
          </h1>
          <p className="text-gray-600">
            Create your vendor account and reach thousands of customers
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl text-xs p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiUser className="text-orange-500" />
                Personal Information
              </h2>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <style jsx global>{`
                    .PhoneInput {
                      width: 100%;
                      height: 44px;
                    }
                    .PhoneInputInput {
                      width: 100%;
                      padding: 10px 12px;
                      padding-left: 24px;
                      border: 1px solid #d1d5db;
                      border-radius: 8px;
                      font-size: 14px;
                      transition: all 0.2s;
                      color: #1f2937 !important;
                    }
                    .PhoneInputInput::placeholder {
                      color: #6b7280 !important;
                      opacity: 1 !important;
                    }
                    .PhoneInputInput:focus {
                      outline: none;
                      border-color: #f97316;
                      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                    }
                    .PhoneInputCountry {
                      margin-left: 12px;
                    }
                    .PhoneInputCountryIcon {
                      width: 24px;
                      height: 18px;
                    }
                    input::placeholder {
                      color: #6b7280 !important;
                      opacity: 1 !important;
                    }
                    input[type="text"],
                    input[type="email"],
                    input[type="password"],
                    textarea {
                      color: #1f2937 !important;
                    }
                  `}</style>
                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={formData.phone}
                    onChange={(value) => {
                      setFormData({ ...formData, phone: value || "" });
                      if (errors.phone) {
                        setErrors((prev) => ({ ...prev, phone: "" }));
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Location Fields */}
              <div className="space-y-4">
                {/* Country */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={countryOptions}
                    value={selectedCountry}
                    onChange={(val) => {
                      setSelectedCountry(val);
                      setSelectedState(null);
                      setSelectedCity(null);
                      setFormData((prev) => ({
                        ...prev,
                        country: val?.value || "",
                        state: "",
                        city: "",
                      }));
                      if (errors.country) {
                        setErrors((prev) => ({ ...prev, country: "" }));
                      }
                    }}
                    placeholder="Select your country"
                    styles={customSelectStyles}
                    isClearable
                  />
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-500">{errors.country}</p>
                  )}
                </div>

                {/* State & City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={stateOptions}
                      value={selectedState}
                      onChange={(val) => {
                        setSelectedState(val);
                        setSelectedCity(null);
                        setFormData((prev) => ({
                          ...prev,
                          state: val?.value || "",
                          city: "",
                        }));
                        if (errors.state) {
                          setErrors((prev) => ({ ...prev, state: "" }));
                        }
                      }}
                      placeholder="Select state"
                      styles={customSelectStyles}
                      isDisabled={!selectedCountry}
                      isClearable
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={cityOptions}
                      value={selectedCity}
                      onChange={(val) => {
                        setSelectedCity(val);
                        setFormData((prev) => ({
                          ...prev,
                          city: val?.value || "",
                        }));
                        if (errors.city) {
                          setErrors((prev) => ({ ...prev, city: "" }));
                        }
                      }}
                      placeholder="Select city"
                      styles={customSelectStyles}
                      isDisabled={!selectedState}
                      isClearable
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BsShop className="text-orange-500" />
                Business Information
              </h2>

              {/* Shop Name */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  className={`block w-full h-11 px-3 py-2.5 border outline-none ${
                    errors.shopName ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                  placeholder="Your Shop Name"
                />
                {errors.shopName && (
                  <p className="mt-1 text-sm text-red-500">{errors.shopName}</p>
                )}
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Shop Categories <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg max-h-80 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer outline-none"
                        checked={formData.categories.includes(category)}
                        onChange={() => handleCategoryChange(category)}
                      />
                      <span className="text-xs text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
                {errors.categories && (
                  <p className="mt-1 text-sm text-red-500">{errors.categories}</p>
                )}
              </div>

              {/* Shop Description */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Shop Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="shopDescription"
                  value={formData.shopDescription}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Tell customers about your shop, products, and services..."
                  className={`block w-full px-3 py-2.5 border outline-none ${
                    errors.shopDescription ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none`}
                />
                {errors.shopDescription && (
                  <p className="mt-1 text-sm text-red-500">{errors.shopDescription}</p>
                )}
              </div>

              {/* Business Address */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Full Business Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Street address of your business"
                  className={`block w-full px-3 py-2.5 border outline-none ${
                    errors.businessAddress ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none`}
                />
                {errors.businessAddress && (
                  <p className="mt-1 text-sm text-red-500">{errors.businessAddress}</p>
                )}
              </div>
            </div>

            {/* ✅ NEW: Bank Account Information */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BsBank className="text-orange-500" />
                  Bank Account Information
                </h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  For receiving payments
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  <FiCreditCard className="inline w-3 h-3 mr-1" />
                  Your bank account will be used to receive payments from sales. All information is encrypted and secure.
                </p>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                      errors.accountName ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                    placeholder="Account name as registered with bank"
                  />
                </div>
                {errors.accountName && (
                  <p className="mt-1 text-sm text-red-500">{errors.accountName}</p>
                )}
              </div>

              {/* Bank Selection and Account Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={bankOptions}
                    value={selectedBank}
                    onChange={(val) => {
                      setSelectedBank(val);
                      setFormData((prev) => ({
                        ...prev,
                        bankName: val?.label || "",
                        bankCode: val?.code || "",
                      }));
                      if (errors.bankName) {
                        setErrors((prev) => ({ ...prev, bankName: "", bankCode: "" }));
                      }
                    }}
                    placeholder="Select your bank"
                    styles={customSelectStyles}
                    isClearable
                  />
                  {errors.bankName && (
                    <p className="mt-1 text-sm text-red-500">{errors.bankName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiCreditCard className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      maxLength="10"
                      className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                        errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                      placeholder="0123456789"
                    />
                  </div>
                  {errors.accountNumber && (
                    <p className="mt-1 text-sm text-red-500">{errors.accountNumber}</p>
                  )}
                </div>
              </div>
              
            </div>

            {/* Security Information */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiLock className="text-orange-500" />
                Security Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`block w-full h-11 pl-10 pr-3 py-2.5 border outline-none ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/terms" className="text-orange-600 hover:text-orange-700 font-medium underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  name="agreeToMarketing"
                  checked={formData.agreeToMarketing}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Send me marketing emails and vendor updates
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!formData.agreeToTerms || isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                !formData.agreeToTerms || isLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 active:scale-98 shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Vendor Account</span>
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-semibold">
                  Sign In
                </Link>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Want to buy instead?{" "}
                <Link href="/register/customer" className="text-green-600 hover:text-green-700 font-semibold">
                  Become a Customer
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Join thousands of successful vendors on Africart
          </p>
        </div>
      </div>
    </div>
  );
}