"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiX, FiUpload, FiPackage, FiSave } from "react-icons/fi";
import toast from "react-hot-toast";

export default function EditProductPage({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [productId, setProductId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    price: "",
    quantity: "",
    sku: "",
    discountPercentage: 0,
    discountStartDate: "",
    discountEndDate: "",
    isActive: true,
    features: [],
  });

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [currentFeature, setCurrentFeature] = useState("");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setProductId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProductData();
      fetchCategories();
    }
  }, [productId]);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubcategories(formData.categoryId);
    } else {
      setSubcategories([]);
      setFormData((prev) => ({ ...prev, subcategoryId: "" }));
    }
  }, [formData.categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}/subcategories`
      );
      const data = await response.json();

      if (data.success) {
        setSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([]);
    }
  };

  const fetchProductData = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please log in");
        router.push("/login");
        return;
      }

      // Fetch product details
      const response = await fetch(
        `/api/vendor/products/${productId}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || "Product not found");
        router.push("/dashboard/vendor/products");
        return;
      }

      const product = data.product;

      setVendorId(data.vendorId);

      // Format dates for datetime-local input
      const formatDateForInput = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        lowStockThreshold: product.lowStockThreshold !== undefined ? product.lowStockThreshold.toString() : "5",
        sku: product.sku || "",
        discountPercentage: product.discountPercentage || 0,
        discountStartDate: formatDateForInput(product.discountStartDate),
        discountEndDate: formatDateForInput(product.discountEndDate),
        isActive: product.isActive,
        features: product.features || [],
      });

      setExistingImages(product.images || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    const trimmed = currentFeature.trim();
    if (trimmed && !formData.features.includes(trimmed)) {
      handleInputChange("features", [...formData.features, trimmed]);
      setCurrentFeature("");
    }
  };

  const removeFeature = (index) => {
    handleInputChange(
      "features",
      formData.features.filter((_, i) => i !== index)
    );
  };

  const handleNewImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValidType = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name} is not a valid image type`);
      if (!isValidSize) toast.error(`${file.name} is too large (max 5MB)`);
      return isValidType && isValidSize;
    });

    const totalImages =
      existingImages.length -
      imagesToDelete.length +
      newImages.length +
      validFiles.length;
    if (totalImages > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setNewImages((prev) => [...prev, ...validFiles]);
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageUrl) => {
    setImagesToDelete((prev) => [...prev, imageUrl]);
  };

  const undoRemoveExistingImage = (imageUrl) => {
    setImagesToDelete((prev) => prev.filter((url) => url !== imageUrl));
  };

  const convertImagesToBase64 = async (imageFiles) => {
  const promises = imageFiles.map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });
  
  return Promise.all(promises);
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error("Product name is required");
    if (!formData.categoryId) return toast.error("Please select a category");
    if (!formData.price || parseFloat(formData.price) <= 0)
      return toast.error("Please enter a valid price");
    if (!formData.quantity || parseInt(formData.quantity) < 0)
      return toast.error("Please enter a valid quantity");

    if (formData.discountPercentage > 0) {
      if (formData.discountStartDate && formData.discountEndDate) {
        const startDate = new Date(formData.discountStartDate);
        const endDate = new Date(formData.discountEndDate);

        if (endDate <= startDate) {
          return toast.error("Discount end date must be after start date");
        }
      }
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem("authToken");

      // Convert selected images to base64
    let base64Images = [];
    if (newImages.length > 0) {
      toast.loading("Preparing images...", { id: "image-prep" });
      base64Images = await convertImagesToBase64(newImages);
      toast.dismiss("image-prep");
    }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || null,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        sku: formData.sku.trim() || null,
        discountPercentage: parseFloat(formData.discountPercentage) || 0,
        discountStartDate: formData.discountStartDate || null,
        discountEndDate: formData.discountEndDate || null,
        images: base64Images,
      existingImages: existingImages.filter(url => !imagesToDelete.includes(url)), // Keep images not marked for deletion
      imagesToDelete: imagesToDelete, // Images to remove
        isActive: formData.isActive,
        features: formData.features.length > 0 ? formData.features : null,
      };

      toast.loading("Creating product...", { id: "product-create" });

      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Product updated successfully!");
        router.push(`/dashboard/vendor/products/${productId}`);
      } else {
        toast.error(data.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setUpdating(false);
    }
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

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/vendor/products`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-gray-600" size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 text-sm">
              Update your product information
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Basic Information
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Essential product details
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Premium Quality Rice 5kg"
                className="w-full text-sm text-gray-900 h-11 outline-none px-4 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={4}
                placeholder="Describe your product features, benefits, and specifications..."
                className="w-full text-gray-900 outline-none px-4 py-3 border text-sm border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Key Features{" "}
                <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add important features one by one
              </p>

              {/* Input + Add Button */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={currentFeature}
                  onChange={(e) => setCurrentFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="e.g., Water resistant"
                  className="flex-1 text-sm px-4 py-3 placeholder-gray-400 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 "
                />
                <button
                  type="button"
                  onClick={addFeature}
                  disabled={!currentFeature.trim()}
                  className="px-4 py-3 text-xs bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Display Added Features as Chips */}
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      <span>{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Count */}
              <p className="text-xs text-gray-500 mt-3">
                {formData.features.length} feature
                {formData.features.length !== 1 ? "s" : ""} added
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    handleInputChange("categoryId", e.target.value)
                  }
                  className="w-full text-sm text-gray-900 px-4 py-3 h-11 outline-none border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  required
                >
                  <option value="" className="text-gray-500">
                    Select category
                  </option>
                  {categories.map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="text-gray-900"
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.categoryId && subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Subcategory{" "}
                    <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) =>
                      handleInputChange("subcategoryId", e.target.value)
                    }
                    className="w-full text-sm text-gray-900 px-4 py-3 h-11 outline-none border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  >
                    <option value="" className="text-gray-500">
                      None (use main category only)
                    </option>
                    {subcategories.map((subcat) => (
                      <option
                        key={subcat._id}
                        value={subcat._id}
                        className="text-gray-900"
                      >
                        {subcat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                className={
                  formData.categoryId && subcategories.length > 0
                    ? "md:col-span-2"
                    : ""
                }
              >
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={String(formData.isActive)}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.value === "true")
                  }
                  className="w-full text-gray-900 px-4 py-3 border h-11 outline-none text-sm border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                >
                  <option value="true" className="text-gray-900">
                    Active
                  </option>
                  <option value="false" className="text-gray-900">
                    Draft
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Pricing & Inventory
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Set your product pricing and stock levels
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="0.00"
                className="w-full text-gray-900 px-4 outline-none text-sm h-11 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                placeholder="0"
                className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Low Stock Alert at
              </label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => handleInputChange("lowStockThreshold", e.target.value)}
                placeholder="5"
                className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                SKU (Optional)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="e.g., RICE-5KG-001"
                className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Discount Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Discount (Optional)
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Set a discount for this product
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Discount Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercentage || ""}
                  onChange={(e) =>
                    handleInputChange("discountPercentage", e.target.value)
                  }
                  placeholder="0"
                  className="w-full text-gray-900 px-4 outline-none text-sm h-11 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">0 = No discount</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.discountStartDate || ""}
                onChange={(e) =>
                  handleInputChange("discountStartDate", e.target.value)
                }
                className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to start now
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                End Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.discountEndDate || ""}
                onChange={(e) =>
                  handleInputChange("discountEndDate", e.target.value)
                }
                className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for no expiry
              </p>
            </div>
          </div>

          {/* Discount Preview */}
          {formData.price && formData.discountPercentage > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Original Price:</span>{" "}
                    {formatCurrency(formData.price)}
                  </p>
                  <p className="text-sm text-green-600 font-bold">
                    <span className="font-semibold">Discounted Price:</span>{" "}
                    {formatCurrency(
                      formData.price * (1 - formData.discountPercentage / 100)
                    )}
                  </p>
                  {(formData.discountStartDate || formData.discountEndDate) && (
                    <p className="text-xs text-gray-600 mt-2">
                      {formData.discountStartDate &&
                        `Starts: ${new Date(
                          formData.discountStartDate
                        ).toLocaleString()}`}
                      {formData.discountStartDate &&
                        formData.discountEndDate &&
                        " | "}
                      {formData.discountEndDate &&
                        `Ends: ${new Date(
                          formData.discountEndDate
                        ).toLocaleString()}`}
                    </p>
                  )}
                </div>
                <div className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold">
                  {formData.discountPercentage}% OFF
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Images */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Product Images
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Manage your product images (max 5 total)
          </p>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Current Images
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {existingImages.map((imageUrl, index) => {
                  const isMarkedForDeletion = imagesToDelete.includes(imageUrl);
                  return (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Product ${index + 1}`}
                        className={`w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm ${
                          isMarkedForDeletion ? "opacity-50 grayscale" : ""
                        }`}
                      />
                      {isMarkedForDeletion ? (
                        <button
                          type="button"
                          onClick={() => undoRemoveExistingImage(imageUrl)}
                          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg text-white text-xs font-semibold"
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeExistingImage(imageUrl)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX size={16} />
                        </button>
                      )}
                      {index === 0 && !isMarkedForDeletion && (
                        <span className="absolute bottom-2 left-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                          Main
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Images */}
          {newImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                New Images to Upload
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {newImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                    >
                      <FiX size={16} />
                    </button>
                    <span className="absolute bottom-2 left-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                      New
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Images */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-orange-400 transition-colors">
            <FiUpload className="mx-auto text-gray-400 mb-4" size={35} />
            <p className="text-gray-700 font-medium text-sm mb-2">
              Add more images
            </p>
            <p className="text-xs text-gray-500 mb-6">
              JPG, PNG, WEBP (max 5MB each)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleNewImageSelect}
              className="hidden"
              id="new-image-upload"
              disabled={
                existingImages.length -
                  imagesToDelete.length +
                  newImages.length >=
                5
              }
            />
            <label
              htmlFor="new-image-upload"
              className={`inline-block px-8 py-2.5 text-xs rounded-lg font-semibold cursor-pointer transition-colors ${
                existingImages.length -
                  imagesToDelete.length +
                  newImages.length >=
                5
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {existingImages.length -
                imagesToDelete.length +
                newImages.length >=
              5
                ? "Max 5 images reached"
                : "Choose Files"}
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/dashboard/vendor/products/${productId}`}
            className="px-8 py-3 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updating}
            className={`px-8 py-3 text-sm rounded-lg font-medium text-white flex items-center gap-3 transition-all ${
              updating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-linear-to-r from-orange-500 to-green-600 hover:shadow-xl"
            }`}
          >
            {updating ? (
              <>Updating...</>
            ) : (
              <>
                <FiSave />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}