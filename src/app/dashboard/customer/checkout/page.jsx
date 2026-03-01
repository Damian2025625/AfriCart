"use client";

import React, { useState, useEffect } from "react";
import {
  FiShoppingCart,
  FiMapPin,
  FiPhone,
  FiUser,
  FiPackage,
  FiCreditCard,
  FiTruck,
  FiAlertCircle,
  FiCheck,
  FiLock,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isNewAddress, setIsNewAddress] = useState(false);

  // Form states
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    additionalInfo: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Gift wrap state
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [vendorDeliveryRates, setVendorDeliveryRates] = useState({});
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingUsedFallback, setShippingUsedFallback] = useState(false);
  const GIFT_WRAP_FEE = 1000;

  // Nigerian States
  const nigerianStates = [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
    "FCT",
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchCart();
    fetchSavedAddresses();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
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
        setShippingAddress((prev) => ({
          ...prev,
          fullName: `${data.user.firstName} ${data.user.lastName}`,
          phone: data.user.phone || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/customer/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        if (data.items.length === 0) {
          toast.error("Your cart is empty");
          router.push("/dashboard/customer/cart");
          return;
        }
        setCartItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/addresses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSavedAddresses(data.addresses || []);

        const defaultAddress = data.addresses.find((addr) => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress._id);
          setShippingAddress({
            fullName: defaultAddress.fullName,
            phone: defaultAddress.phone,
            address: defaultAddress.address,
            city: defaultAddress.city,
            state: defaultAddress.state,
            zipCode: defaultAddress.zipCode || "",
            additionalInfo: defaultAddress.additionalInfo || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address._id);
    setShippingAddress({
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode || "",
      additionalInfo: address.additionalInfo || "",
    });
    setIsNewAddress(false);
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...shippingAddress,
          label: "HOME",
          isDefault: savedAddresses.length === 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Address saved successfully");
        fetchSavedAddresses();
      } else {
        toast.error(data.message || "Failed to save address");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const product = item.product;
      const price = product?.customPrice || product?.price || 0;
      return sum + price * item.quantity;
    }, 0);
  };

  // We now fetch delivery fees dynamically
  useEffect(() => {
    if (cartItems.length > 0 && shippingAddress.city && shippingAddress.state) {
      calculateLiveShippingFee();
    } else {
      setDeliveryFee(0);
      setVendorDeliveryRates({});
    }
  }, [cartItems, shippingAddress.city, shippingAddress.state, shippingAddress.address]);

  const calculateLiveShippingFee = async () => {
    try {
      setIsCalculatingShipping(true);

      const itemsForShipping = cartItems.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      }));

      const res = await fetch("/api/customer/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsForShipping,
          customerAddress: shippingAddress,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDeliveryFee(data.totalDeliveryFee);
        setVendorDeliveryRates(data.vendorDeliveryRates);
        setShippingUsedFallback(data.usedFallback || false);
      } else {
        toast.error(data.message || "Could not calculate live delivery fees");
        setDeliveryFee(0);
      }
    } catch (error) {
      console.error("Shipping Rate Error:", error);
      toast.error("Error calculating shipping rates");
      setDeliveryFee(0);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const calculateTotal = () => {
    let total = calculateSubtotal() + deliveryFee;
    if (isGiftWrapped) {
      total += GIFT_WRAP_FEE;
    }
    return total;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validateForm = () => {
    if (!shippingAddress.fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!shippingAddress.address.trim()) {
      toast.error("Please enter your delivery address");
      return false;
    }
    if (!shippingAddress.city.trim()) {
      toast.error("Please enter your city");
      return false;
    }
    if (!shippingAddress.state) {
      toast.error("Please select your state");
      return false;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return false;
    }
    return true;
  };

  // ==========================================
  // 🔥 FIXED handlePlaceOrder Function
  // ==========================================
  // Replace your entire handlePlaceOrder function with this:

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setPlacingOrder(true);

    try {
      const token = localStorage.getItem("authToken");

      // STEP 1: Auto-save address if new
      if (isNewAddress || !selectedAddressId) {
        try {
          await fetch("/api/customer/addresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...shippingAddress,
              label: "HOME",
              isDefault: savedAddresses.length === 0,
            }),
          });
        } catch (addressError) {
          console.error("Failed to save address:", addressError);
        }
      }

      // ==========================================
      // 🔥 CORRECTED PAYMENT FLOW
      // ==========================================

      if (paymentMethod === "CARD" || paymentMethod === "BANK_TRANSFER") {
        // ✅ For Card/Bank Transfer: Initialize Payment with Cart Items
        console.log("🔄 Initializing Paystack payment with split...");

        // ✅ Prepare cart items for payment API
        const paymentCartItems = cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          customPrice: item.product.customPrice || null,
        }));

        // Store order details for after payment
        const orderDetails = {
          shippingAddress,
          paymentMethod,
          items: paymentCartItems,
          subtotal: calculateSubtotal(),
          deliveryFee: deliveryFee,
          vendorDeliveryRates, // optionally store this for specific vendor splits soon
          isGiftWrapped,
          giftWrapFee: isGiftWrapped ? GIFT_WRAP_FEE : 0,
          total: calculateTotal(),
        };

        localStorage.setItem("pendingOrder", JSON.stringify(orderDetails));

        // ✅ Initialize payment WITH cart items for split
        const paymentResponse = await fetch("/api/payment/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: currentUser?.email,
            amount: calculateTotal(),
            customerName: `${currentUser?.firstName} ${currentUser?.lastName}`,
            phone: currentUser?.phone || shippingAddress.phone,
            cartItems: paymentCartItems, // ⚠️ CRITICAL: Cart items for vendor split!
            metadata: {
              customerId: currentUser?._id,
              customerName: `${currentUser?.firstName} ${currentUser?.lastName}`,
              items: cartItems.length,
              paymentMethod: paymentMethod,
              address: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zipCode: shippingAddress.zipCode,
              additionalInfo: shippingAddress.additionalInfo,
              subtotal: calculateSubtotal(),
              deliveryFee: deliveryFee,
              isGiftWrapped,
              giftWrapFee: isGiftWrapped ? GIFT_WRAP_FEE : 0,
              vendorDeliveryRates: JSON.stringify(vendorDeliveryRates), // Pass this along
              cartItems: paymentCartItems, // ✅ BACKUP: Include in metadata too
            },
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentData.success) {
          toast.error(paymentData.message || "Failed to initialize payment");
          setPlacingOrder(false);
          return;
        }

        console.log(
          "✅ Payment initialized with vendors:",
          paymentData.data.vendors,
        );
        console.log(
          "💰 Platform commission:",
          paymentData.data.platformCommission,
        );

        // Show success message with vendor info
        const vendorsList = paymentData.data.vendors?.join(", ") || "vendors";
        toast.success(
          `Redirecting to payment... Split across: ${vendorsList}`,
          { duration: 3000 },
        );

        setTimeout(() => {
          window.location.href = paymentData.data.authorization_url;
        }, 1500);
      } else {
        // ✅ For Cash on Delivery: Create Order DIRECTLY
        console.log("🔄 Creating Cash on Delivery order...");

        // ✅ Prepare cart items for order creation
        const cleanItems = cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          customPrice: item.product.customPrice || null,
        }));

        const orderPayload = {
          shippingAddress,
          paymentMethod,
          items: cleanItems,
          subtotal: calculateSubtotal(),
          deliveryFee: deliveryFee,
          vendorDeliveryRates,
          isGiftWrapped,
          giftWrapFee: isGiftWrapped ? GIFT_WRAP_FEE : 0,
          total: calculateTotal(),
        };

        const orderResponse = await fetch("/api/customer/orders/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderPayload),
        });

        const orderData = await orderResponse.json();

        if (!orderData.success) {
          toast.error(orderData.message || "Failed to create order");
          setPlacingOrder(false);
          return;
        }

        const orderNumber = orderData.masterOrder.orderNumber;
        console.log("✅ Order created:", orderNumber);

        toast.success("Order placed successfully! 🎉");
        window.dispatchEvent(new Event("cartUpdated"));

        setTimeout(() => {
          router.push(`/dashboard/customer/orders/${orderNumber}`);
        }, 1000);
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600 text-sm">
          Complete your order and get your items delivered
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <FiMapPin className="text-orange-600 w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Delivery Address
                  </h2>
                  <p className="text-xs text-gray-600">
                    Where should we deliver your order?
                  </p>
                </div>
              </div>

              {savedAddresses.length > 0 && (
                <button
                  onClick={() => {
                    setIsNewAddress(true);
                    setSelectedAddressId(null);
                    setShippingAddress({
                      fullName: `${currentUser?.firstName} ${currentUser?.lastName}`,
                      phone: currentUser?.phone || "",
                      address: "",
                      city: "",
                      state: "",
                      zipCode: "",
                      additionalInfo: "",
                    });
                  }}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  + New Address
                </button>
              )}
            </div>

            {/* Saved Addresses */}
            {savedAddresses.length > 0 && !isNewAddress && (
              <div className="space-y-3 mb-6">
                {savedAddresses.map((addr) => (
                  <label
                    key={addr._id}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedAddressId === addr._id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr._id}
                      onChange={() => handleSelectAddress(addr)}
                      className="mt-1 w-5 h-5 text-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {addr.fullName}
                        </span>
                        {addr.isDefault && (
                          <span className="bg-green-100 text-green-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            DEFAULT
                          </span>
                        )}
                        <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {addr.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{addr.phone}</p>
                      <p className="text-xs text-gray-600">
                        {addr.address}, {addr.city}, {addr.state}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* New Address Form */}
            {(savedAddresses.length === 0 || isNewAddress) && (
              <div className="space-y-4">
                {isNewAddress && (
                  <button
                    onClick={() => {
                      setIsNewAddress(false);
                      if (savedAddresses.length > 0) {
                        handleSelectAddress(savedAddresses[0]);
                      }
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 mb-2"
                  >
                    ← Back to saved addresses
                  </button>
                )}

                {/* Full Name and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={shippingAddress.fullName}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-700 placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="08012345678"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-700 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Delivery Address *
                  </label>
                  <textarea
                    value={shippingAddress.address}
                    onChange={(e) =>
                      setShippingAddress((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Enter your full delivery address"
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-gray-500"
                  />
                </div>

                {/* City, State, Zip Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="Lagos"
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none text-gray-700 focus:border-orange-500"
                    >
                      <option value="">Select</option>
                      {nigerianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({
                          ...prev,
                          zipCode: e.target.value,
                        }))
                      }
                      placeholder="100001"
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Information (Optional)
                  </label>
                  <textarea
                    value={shippingAddress.additionalInfo}
                    onChange={(e) =>
                      setShippingAddress((prev) => ({
                        ...prev,
                        additionalInfo: e.target.value,
                      }))
                    }
                    placeholder="Any landmarks or special delivery instructions?"
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-gray-500"
                  />
                </div>

                {/* Info banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <FiAlertCircle className="inline w-3 h-3 mr-1" />
                    Your address will be automatically saved when you place this
                    order
                  </p>
                </div>

                {/* Save Address Button */}
                {isNewAddress && (
                  <button
                    onClick={handleSaveAddress}
                    className="w-full py-2 border border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors text-sm"
                  >
                    Save Address Now (Optional)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiCreditCard className="text-green-600 w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Payment Method
                </h2>
                <p className="text-xs text-gray-600">
                  How would you like to pay?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Pay with Paystack (card + bank transfer + USSD + all channels) */}
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "CARD"
                    ? "border-orange-500 bg-orange-50 shadow-sm"
                    : "border-gray-200 hover:border-orange-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="CARD"
                  checked={paymentMethod === "CARD"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCreditCard className="text-orange-500 w-5 h-5" />
                    <span className="font-semibold text-gray-900 text-sm">
                      Pay with Paystack
                    </span>
                    <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Card · Bank Transfer · USSD · Mobile Money — all secured by Paystack
                  </p>
                </div>
                {paymentMethod === "CARD" && (
                  <FiCheck className="text-orange-500 w-6 h-6 flex-shrink-0" />
                )}
              </label>

              {/* Option 2: Cash on Delivery */}
              <label
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "CASH_ON_DELIVERY"
                    ? "border-orange-500 bg-orange-50 shadow-sm"
                    : "border-gray-200 hover:border-orange-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="CASH_ON_DELIVERY"
                  checked={paymentMethod === "CASH_ON_DELIVERY"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FiTruck className="text-orange-500 w-5 h-5" />
                    <span className="font-semibold text-gray-900 text-sm">
                      Pay on Delivery
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pay with cash when your order arrives at your doorstep
                  </p>
                </div>
                {paymentMethod === "CASH_ON_DELIVERY" && (
                  <FiCheck className="text-orange-500 w-6 h-6 flex-shrink-0" />
                )}
              </label>
            </div>

            {/* Paystack security note */}
            {paymentMethod === "CARD" && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <FiLock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    You will be redirected to Paystack's secure checkout. Choose your preferred payment method there: card, bank transfer, USSD, and more.
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 text-orange-500 mt-0.5"
              />
              <span className="text-xs text-gray-700">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-orange-600 font-semibold hover:underline"
                >
                  terms and conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-orange-600 font-semibold hover:underline"
                >
                  privacy policy
                </Link>
                . I understand that my order will be processed and delivered
                according to AfriCart's delivery terms.
              </span>
            </label>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cartItems.map((item) => {
                const product = item.product; // ✅ Changed
                const price = product?.customPrice || product?.price || 0; // ✅ Changed
                const hasCustomPrice =
                  product?.customPrice && product.customPrice !== product.price;

                return (
                  <div key={item._id} className="flex gap-3">
                    {/* ... */}
                    <div className="flex-1">
                      <h3 className="text-xs text-gray-600 font-bold">
                        {product?.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        Qty: {item.quantity}
                      </p>

                      {/* Price */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-orange-600">
                          {formatCurrency(price * item.quantity)}
                        </p>
                        {hasCustomPrice && (
                          <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">
                            SPECIAL
                          </span>
                        )}
                      </div>

                      {/* Strikethrough original price */}
                      {hasCustomPrice && (
                        <p className="text-[10px] text-gray-400 line-through">
                          Regular:{" "}
                          {formatCurrency(product.price * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gift Wrap Toggle */}
            <div className="border-t border-gray-200 pt-4 pb-2">
              <label className="flex flex-col cursor-pointer bg-pink-50 border border-pink-200 rounded-lg p-3 hover:bg-pink-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiPackage className="text-pink-500 w-5 h-5" />
                    <span className="font-semibold text-gray-900 text-sm">Add Gift Wrapping</span>
                  </div>
                  <div className="relative inline-flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isGiftWrapped}
                      onChange={(e) => setIsGiftWrapped(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-7">
                  Beautifully wrapped for your loved ones. (+{formatCurrency(GIFT_WRAP_FEE)})
                </p>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {isGiftWrapped && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Gift Wrapping</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(GIFT_WRAP_FEE)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold text-gray-900">
                  {isCalculatingShipping ? (
                    <span className="text-gray-400 text-xs italic">Calculating...</span>
                  ) : deliveryFee === 0 ? (
                    <span className="text-green-600">Enter address to calculate</span>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>

              {/* Note when using flat-rate fallback */}
              {shippingUsedFallback && deliveryFee > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-[10px] text-amber-700">
                    <FiTruck className="inline w-3 h-3 mr-1" />
                    Estimated delivery fee. Final rate confirmed at dispatch.
                  </p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-orange-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>


            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder || cartItems.length === 0}
              className="w-full mt-6 py-3 bg-linear-to-r from-orange-500 to-green-500 text-sm text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placingOrder ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                  {paymentMethod === "CASH_ON_DELIVERY"
                    ? "Placing Order..."
                    : "Processing..."}
                </>
              ) : (
                <>
                  {paymentMethod === "CASH_ON_DELIVERY" ? (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Place Order ({formatCurrency(total)})
                    </>
                  ) : (
                    <>
                      <FiLock className="w-5 h-5" />
                      Pay {formatCurrency(total)} Securely
                    </>
                  )}
                </>
              )}
            </button>

            {(paymentMethod === "CARD" ||
              paymentMethod === "BANK_TRANSFER") && (
              <p className="text-[10px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
                <FiLock className="w-3 h-3" />
                Secured by Flutterwave
              </p>
            )}

            {paymentMethod === "CASH_ON_DELIVERY" && (
              <p className="text-[10px] text-gray-500 text-center mt-3">
                Your personal data will be used to process your order and
                support your experience throughout this website.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
