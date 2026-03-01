"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiDollarSign,
  FiBox,
  FiCalendar,
  FiTag,
  FiEye,
  FiShoppingCart,
  FiImage,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [vendorId, setVendorId] = useState(null);
  const [productId, setProductId] = useState(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setProductId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please log in");
        router.push("/login");
        return;
      }

      // Fetch product details
      const response = await fetch(`/api/vendor/products/${productId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || "Product not found");
        router.push("/dashboard/vendor/products");
        return;
      }

      setProduct(data.product);
      setVendorId(data.vendorId);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/vendor/products/${product._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Product deleted successfully");
        router.push("/dashboard/vendor/products");
      } else {
        toast.error(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/vendor/products/${product._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Product ${!product.isActive ? "activated" : "deactivated"}`
        );
        setProduct({ ...product, isActive: !product.isActive });
      } else {
        toast.error(data.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product status");
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStockStatus = (quantity, isActive) => {
    if (!isActive)
      return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
    if (quantity === 0)
      return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (quantity <= 10)
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In Stock", color: "bg-green-100 text-green-800" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500"></div>
            <div className="absolute inset-3 bg-linear-to-br from-orange-500 to-green-600 rounded-full animate-pulse flex items-center justify-center">
              <FiPackage className="text-white text-2xl" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Loading Product
          </h3>
          <p className="text-gray-600 animate-pulse">Fetching details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiPackage className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Product Not Found
          </h3>
          <Link
            href="/dashboard/vendor/products"
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.quantity, product.isActive);
  const images = product.images || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/vendor/products"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-gray-600" size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 text-sm">Product Details</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/vendor/products/${product._id}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            <FiEdit2 size={16} />
            Edit
          </Link>
          <button
            onClick={handleDeleteProduct}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors font-semibold text-sm"
          >
            <FiTrash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            {/* Main Image */}
            <div className="relative h-96 bg-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <FiImage className="mx-auto text-gray-300 mb-3" size={64} />
                  <p className="text-gray-500 text-sm">No images available</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${stockStatus.color}`}
                >
                  {stockStatus.label}
                </span>
              </div>
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-orange-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Description
            </h2>
            {product.description ? (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                No description available
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-6">
          {/* Price & Stock Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              Pricing & Inventory
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiDollarSign className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Price</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiBox className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Stock Quantity</p>
                    <p className="text-xl font-bold text-gray-900">
                      {product.quantity}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiShoppingCart className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Sold</p>
                    <p className="text-xl font-bold text-gray-900">
                      {product.totalSold || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiEye className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Views</p>
                    <p className="text-xl font-bold text-gray-900">
                      {product.views || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              Product Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FiTag className="text-gray-400 mt-1" size={16} />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Category</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {product.category?.name || "Uncategorized"}
                  </p>
                </div>
              </div>

              {product.subcategory && (
                <div className="flex items-start gap-3">
                  <FiTag className="text-gray-400 mt-1" size={16} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Subcategory</p>
                    <p className="text-sm font-semibold text-green-600">
                      {product.subcategory.name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <FiPackage className="text-gray-400 mt-1" size={16} />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">SKU</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {product.sku || "Auto-generated"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiCalendar className="text-gray-400 mt-1" size={16} />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(product.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiCalendar className="text-gray-400 mt-1" size={16} />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(product.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button
                onClick={handleToggleStatus}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                  product.isActive
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {product.isActive ? "Deactivate Product" : "Activate Product"}
              </button>

              <Link
                href={`/dashboard/vendor/products/${product._id}/edit`}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-linear-to-r from-orange-500 to-green-600 text-white hover:shadow-lg transition-all block text-center"
              >
                Edit Product
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}