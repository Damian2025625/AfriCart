"use client";

import { useState, useEffect } from "react";
import {
  FiShoppingBag,
  FiTruck,
  FiGift,
  FiAward,
  FiTrash2,
  FiMinus,
  FiPlus,
  FiArrowLeft,
  FiLock,
  FiCreditCard,
  FiTag,
  FiPackage,
  FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState({});
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  // New shipping state
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingUsedFallback, setShippingUsedFallback] = useState(false);


  useEffect(() => {
    fetchCartItems();
    fetchDefaultAddress();
  }, []);

  const fetchDefaultAddress = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/customer/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success && data.addresses) {
        const defaultAddr = data.addresses.find((addr) => addr.isDefault) || data.addresses[0];
        if (defaultAddr) {
          setShippingAddress(defaultAddr);
        }
      }
    } catch (error) {
      console.error("Error fetching default address:", error);
    }
  };

  // Live Shipping Calculation (Matches Checkout)
  useEffect(() => {
    if (cartItems.length > 0 && shippingAddress?.city && shippingAddress?.state) {
      calculateLiveShippingFee();
    } else {
      setDeliveryFee(0);
    }
  }, [cartItems, shippingAddress]);

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
        setShippingUsedFallback(data.usedFallback || false);
      }
    } catch (error) {
      console.error("Shipping Rate Error:", error);
    } finally {
      setIsCalculatingShipping(false);
    }
  };


  const fetchCartItems = async () => {
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

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch cart");
      }

      setCartItems(data.items || []);
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart items");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isDiscountActive = (product) => {
    if (!product.discountPercentage || product.discountPercentage === 0)
      return false;

    const now = new Date();
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    return (!startDate || now >= startDate) && (!endDate || now <= endDate);
  };

  const getDiscountedPrice = (product) => {
    // ✅ First priority: Custom price
    if (product.customPrice) {
      return product.customPrice;
    }

    // Second priority: Regular discount
    if (isDiscountActive(product)) {
      return product.price * (1 - product.discountPercentage / 100);
    }

    // Default: Regular price
    return product.price;
  };

  const updateQuantity = async (itemId, productId, currentQuantity, delta) => {
    const newQuantity = Math.max(1, currentQuantity + delta);

    if (newQuantity === currentQuantity) return;

    setUpdatingItems((prev) => ({ ...prev, [itemId]: true }));

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/customer/cart/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          quantity: newQuantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update quantity");
      }

      // Update local state
      setCartItems((items) =>
        items.map((item) =>
          item.product._id === productId
            ? { ...item, quantity: data.updatedQuantity || newQuantity }
            : item
        )
      );

      // Trigger cart update event
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error(error.message || "Failed to update quantity");
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const removeItem = async (productId) => {
    setUpdatingItems((prev) => ({ ...prev, [productId]: true }));

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/customer/cart/remove", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove");
      }

      setCartItems((items) =>
        items.filter((item) => item.product._id !== productId)
      );
      toast.success("Item removed from cart");

      // Trigger cart update event
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const applyPromo = () => {
    if (promoCode.trim()) {
      setPromoApplied(true);
      toast.success("Promo code applied!");
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = getDiscountedPrice(item.product);
      return sum + price * item.quantity;
    }, 0);

    const shipping = deliveryFee;
    const tax = subtotal * 0.075;
    const discount = promoApplied ? subtotal * 0.1 : 0;
    const total = subtotal + shipping + tax - discount;

    return { subtotal, shipping, tax, discount, total };
  };

  const toSentenceCase = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const { subtotal, shipping, tax, discount, total } = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-linear-to-br from-orange-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FiShoppingBag className="text-white text-xl md:text-2xl" />
              </div>
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg">
                  {cartItems.length}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Your Cart
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}{" "}
                ready for checkout
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/shop")}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors self-start md:self-auto"
          >
            <FiArrowLeft />
            Continue Shopping
          </button>
        </div>

        {/* Benefits Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100 flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <FiTruck className="text-orange-600 text-xl" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Free Shipping</p>
              <p className="text-xs text-gray-600">On orders over ₦50,000</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <FiGift className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Gift Wrapping</p>
              <p className="text-xs text-gray-600">Available at checkout</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100 flex items-center gap-3 sm:col-span-2 md:col-span-1">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <FiAward className="text-purple-600 text-xl" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Rewards Points</p>
              <p className="text-xs text-gray-600">Earn with every purchase</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.some(item => (item.product.quantity || 0) <= 0) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                  <FiAlertCircle className="text-red-500 text-lg shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-bold text-sm">One or more items are out of stock</p>
                    <p className="text-red-600 text-xs">Please remove individual out-of-stock items from your cart to proceed with checkout.</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Cart Items</h2>
                <span className="text-xs text-gray-500">
                  {cartItems.length} items
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiShoppingBag className="text-gray-300 text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Your cart is empty
                  </h3>
                  <button
                    onClick={() => router.push("/shop")}
                    className="text-orange-600 font-semibold text-sm hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cartItems.map((item) => {
                  const product = item.product;
                  const mainImage = product.images?.[0];
                  const price = getDiscountedPrice(product);
                  const hasDiscount = isDiscountActive(product);
                  const hasCustomPrice = !!product.customPrice; // ✅ Add this
                  const isUpdating = updatingItems[product._id];
                  const isOutOfStock = (product.quantity || 0) <= 0;

                  return (
                    <div
                      key={product._id}
                      className={`bg-white rounded-xl p-2 sm:p-3 shadow-xs hover:shadow-sm transition-all border border-gray-100 ${
                        isUpdating ? "opacity-50 pointer-events-none" : ""
                      } ${isOutOfStock ? "border-red-200 bg-red-50/10" : ""}`}
                    >
                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-50 relative">
                          {mainImage ? (
                            <img
                              src={mainImage}
                              alt={product.name}
                              className={`w-full h-full object-cover ${isOutOfStock ? "grayscale opacity-50" : ""}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage className="text-gray-200 text-xl" />
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[8px] font-black text-white px-1 py-0.5 border border-white rounded uppercase tracking-tighter">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight truncate">
                                {product.vendor?.businessName || "Local Vendor"}
                              </p>
                              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate leading-tight">
                                {toSentenceCase(product.name)}
                              </h3>
                              {isOutOfStock && (
                                <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                                  <FiAlertCircle className="text-[12px]" />
                                  Item currently unavailable
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(product._id)}
                              disabled={isUpdating}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-1 sm:mt-2">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100 ${isOutOfStock ? "opacity-30 pointer-events-none" : ""}`}>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      product._id,
                                      item.quantity,
                                      -1
                                    )
                                  }
                                  disabled={isUpdating}
                                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-orange-600"
                                >
                                  <FiMinus className="text-[10px]" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-gray-900">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      product._id,
                                      item.quantity,
                                      1
                                    )
                                  }
                                  disabled={isUpdating}
                                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-green-600"
                                >
                                  <FiPlus className="text-[10px]" />
                                </button>
                              </div>

                              {!isOutOfStock && (
                                <span className="hidden sm:block text-[10px] text-gray-400 font-medium">
                                  {formatCurrency(price)} / unit
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              {/* ✅ Show custom price badge */}
                              {hasCustomPrice && (
                                <span className="text-[9px] text-green-500 font-bold block leading-none mb-0.5">
                                  SPECIAL PRICE
                                </span>
                              )}
                              {/* Show discount badge only if no custom price */}
                              {!hasCustomPrice && hasDiscount && (
                                <span className="text-[9px] text-red-500 font-bold block leading-none mb-0.5">
                                  SAVE {product.discountPercentage}%
                                </span>
                              )}
                              <p className={`text-sm sm:text-base font-extrabold text-gray-900 leading-none ${isOutOfStock ? "text-gray-400" : ""}`}>
                                {formatCurrency(price * item.quantity)}
                              </p>
                              {/* ✅ Show original price if custom price exists */}
                              {hasCustomPrice && (
                                <p className="text-[9px] text-gray-400 line-through leading-none mt-0.5">
                                  {formatCurrency(product.price * item.quantity)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-4">
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">
                  Summary
                </h2>
                <p className="text-xs text-gray-500 mb-5 border-b border-gray-50 pb-3">
                  Finalize your purchase
                </p>

                {/* Promo Code */}
                <div className="mb-5">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 flex items-center px-2">
                      <FiTag className="text-gray-400 text-xs mr-2" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo code"
                        className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 py-2 focus:outline-none text-xs w-full"
                      />
                    </div>
                    <button
                      onClick={applyPromo}
                      className="px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all"
                    >
                      Apply
                    </button>
                  </div>
                  {promoApplied && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 text-[10px] font-bold">
                      <FiAlertCircle />
                      <span>10% discount applied!</span>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start text-gray-600 text-xs">
                    <div>
                      <span>Shipping</span>
                      {shippingAddress && (
                        <p className="text-[10px] text-gray-400 font-medium leading-none mt-1 uppercase">
                          To: {shippingAddress.city}, {shippingAddress.state}
                        </p>
                      )}
                      {!shippingAddress && (
                        <p className="text-[10px] text-orange-500 font-medium leading-none mt-1">
                          Calculated at checkout
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {isCalculatingShipping ? (
                        <span className="animate-pulse">...</span>
                      ) : shipping === 0 ? (
                        <span className="text-green-600 font-bold">FREE</span>
                      ) : (
                        formatCurrency(shipping)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Tax</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(tax)}
                    </span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-red-600 text-xs font-bold bg-red-50 p-1.5 rounded-md">
                      <span>Discount</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-gray-100 mb-5">
                  <div className="flex justify-between items-end">
                    <span className="text-gray-900 font-bold text-sm">
                      Grand Total
                    </span>
                    <div className="text-right">
                      <p className="text-xl font-black text-gray-900 leading-none tracking-tight">
                        {formatCurrency(total)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">
                        TOTAL NGN
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button 
                  onClick={() => router.push("/dashboard/customer/checkout")}
                  disabled={cartItems.length === 0 || cartItems.some(item => (item.product.quantity || 0) <= 0)}
                  className="w-full py-3.5 bg-linear-to-r from-orange-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mb-1"
                >
                  <FiLock className="text-xs" />
                  Checkout Now
                </button>
                {cartItems.some(item => (item.product.quantity || 0) <= 0) && (
                  <p className="text-[10px] text-red-600 font-bold text-center mb-3">Remove out-of-stock items to proceed</p>
                )}

              <div className="flex items-center justify-center gap-3 py-1 grayscale opacity-50">
                <div className="w-8 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
