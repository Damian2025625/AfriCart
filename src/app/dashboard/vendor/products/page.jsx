"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import localforage from "localforage";
import {
  FiPackage,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiAlertTriangle,
  FiBox,
  FiTrendingUp,
  FiX,
  FiUpload,
  FiChevronDown,
  FiZap,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [modalSubcategories, setModalSubcategories] = useState([]);
  const [currentFeature, setCurrentFeature] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    price: "",
    quantity: "",
    lowStockThreshold: 5,
    weight: "1",
    sku: "",
    discountPercentage: 0,
    discountStartDate: "",
    discountEndDate: "",
    isActive: true,
    features: [],
  });

  // Action Menu
  const [activeMenu, setActiveMenu] = useState(null);

  // Offline State
  const [isOffline, setIsOffline] = useState(false);

  const convertImagesToBase64 = async (imageFiles) => {
    const promises = imageFiles.map((file) => {
      if (typeof file === "string") return Promise.resolve(file);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  const syncOfflineProducts = async () => {
    try {
      const queue = await localforage.getItem("offline-product-queue") || [];
      if (queue.length === 0) return;

      const token = localStorage.getItem("authToken");
      if (!token) return;

      toast.loading(`Syncing ${queue.length} offline product(s)...`, { id: "sync-offline" });
      
      let successCount = 0;
      const failedQueue = [];

      for (const productData of queue) {
        try {
          const response = await fetch("/api/vendor/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            successCount++;
          } else {
            failedQueue.push(productData);
          }
        } catch (error) {
          failedQueue.push(productData);
        }
      }

      await localforage.setItem("offline-product-queue", failedQueue);

      toast.dismiss("sync-offline");
      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} offline product(s)!`);
        fetchProducts(); // Refresh list
      }
      if (failedQueue.length > 0) {
        toast.error(`Failed to sync ${failedQueue.length} product(s). Will retry later.`);
      }
    } catch (error) {
      console.error("Error syncing offline products:", error);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineProducts();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (typeof navigator !== "undefined") {
      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        syncOfflineProducts();
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load draft when modal opens
  useEffect(() => {
    if (showAddProductModal) {
      const loadDraft = async () => {
        try {
          const draft = await localforage.getItem("vendor-product-draft");
          if (draft) {
             if (draft.formData) {
               setFormData((prev) => ({ ...prev, ...draft.formData }));
               if (draft.selectedImages && Array.isArray(draft.selectedImages)) {
                 setSelectedImages(draft.selectedImages);
               }
             } else {
               setFormData((prev) => ({ ...prev, ...draft }));
             }
             toast("Restored from offline draft", { icon: "📝" });
          }
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      };
      loadDraft();
    }
  }, [showAddProductModal]);

  // Auto-save draft whenever formData changes
  useEffect(() => {
    if (showAddProductModal) {
      const timer = setTimeout(async () => {
        // Skip saving empty draft right after modal reset
        if (formData.name !== "") {
          try {
            const base64Images = await convertImagesToBase64(selectedImages);
            await localforage.setItem("vendor-product-draft", {
              formData,
              selectedImages: base64Images
            });
          } catch(e) {
            console.error("Auto-save failed", e);
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [formData, selectedImages, showAddProductModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, selectedStatus, products]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formData.categoryId) {
      fetchModalSubcategories(formData.categoryId);
    } else {
      setModalSubcategories([]);
      setFormData((prev) => ({ ...prev, subcategoryId: "" }));
    }
  }, [formData.categoryId]); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please log in");
        router.push("/login");
        return;
      }

      // Fetch vendor stats to get vendorId
      const statsResponse = await fetch("/api/vendor/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const statsData = await statsResponse.json();

      if (statsData.success) {
        setVendorId(statsData.vendor.id);
      }

      // Fetch products
      const productsResponse = await fetch("/api/vendor/products/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const productsData = await productsResponse.json();

      if (productsData.success) {
        setProducts(productsData.products || []);
        calculateStats(productsData.products || []);
      }

      // Fetch categories
      const categoriesResponse = await fetch("/api/categories");
      const categoriesData = await categoriesResponse.json();

      if (categoriesData.success) {
        setCategories(categoriesData.categories || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchModalSubcategories = async (categoryId) => {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}/subcategories`,
      );
      const data = await response.json();

      if (data.success) {
        setModalSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setModalSubcategories([]);
    }
  };

  const calculateStats = (productsData) => {
    const total = productsData.length;
    const active = productsData.filter((p) => p.isActive).length;
    const lowStock = productsData.filter(
      (p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5),
    ).length;
    const outOfStock = productsData.filter((p) => p.quantity === 0).length;

    setStats({ total, active, lowStock, outOfStock });
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (p) =>
          p.categoryId?._id === selectedCategory ||
          p.categoryId === selectedCategory,
      );
    }

    if (selectedStatus === "active") {
      filtered = filtered.filter((p) => p.isActive === true);
    } else if (selectedStatus === "inactive") {
      filtered = filtered.filter((p) => p.isActive === false);
    } else if (selectedStatus === "low_stock") {
      filtered = filtered.filter((p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5));
    } else if (selectedStatus === "out_of_stock") {
      filtered = filtered.filter((p) => p.quantity === 0);
    } else if (selectedStatus === "promoted") {
      filtered = filtered.filter((p) => p.activeSlashId);
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product) => {
    if (!product.isActive)
      return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
    if (product.quantity === 0)
      return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (product.quantity <= (product.lowStockThreshold !== undefined ? product.lowStockThreshold : 5))
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Active", color: "bg-green-100 text-green-800" };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleStatus = async (product) => {
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
          `Product ${!product.isActive ? "activated" : "deactivated"}`,
        );
        fetchProducts();
      } else {
        toast.error(data.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
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
    setSelectedImages((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
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
      formData.features.filter((_, i) => i !== index),
    );
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Product name is required");
    if (!formData.categoryId) return toast.error("Please select a category");
    if (!formData.price || parseFloat(formData.price) <= 0)
      return toast.error("Please enter a valid price");
    if (!formData.quantity || parseInt(formData.quantity) < 0)
      return toast.error("Please enter a valid quantity");
    if (!formData.weight || parseFloat(formData.weight) <= 0)
      return toast.error("Please enter a valid weight (e.g. 1.5)");

    setAddProductLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      let base64Images = [];
      if (selectedImages.length > 0) {
        toast.loading("Preparing images...", { id: "image-prep" });
        base64Images = await convertImagesToBase64(selectedImages);
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
        weight: parseFloat(formData.weight) || 1,
        sku: formData.sku.trim() || null,
        discountPercentage: parseFloat(formData.discountPercentage) || 0,
        discountStartDate: formData.discountStartDate || null,
        discountEndDate: formData.discountEndDate || null,
        images: base64Images,
        isActive: formData.isActive,
        features: formData.features.length > 0 ? formData.features : null,
      };

      if (isOffline || !navigator.onLine) {
        const queue = await localforage.getItem("offline-product-queue") || [];
        queue.push(productData);
        await localforage.setItem("offline-product-queue", queue);
        
        await localforage.removeItem("vendor-product-draft"); // Clear open draft
        
        toast.success("Saved to offline sync queue. Will automatically upload when you reconnect.");
        setAddProductLoading(false);
        closeModal();
        return;
      }

      toast.loading("Creating product...", { id: "product-create" });

      let response;
      try {
        response = await fetch("/api/vendor/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        });
      } catch (fetchError) {
        if (fetchError instanceof TypeError && (fetchError.message === "Failed to fetch" || fetchError.message.includes("NetworkError"))) {
          const queue = await localforage.getItem("offline-product-queue") || [];
          queue.push(productData);
          await localforage.setItem("offline-product-queue", queue);
          
          await localforage.removeItem("vendor-product-draft"); // Clear open draft
          
          toast.success("Network unreachable. Saved to offline sync queue for auto-upload.", { id: "product-create" });
          setAddProductLoading(false);
          closeModal();
          return;
        }
        throw fetchError;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Product added successfully!", { id: "product-create" });
        await localforage.removeItem("vendor-product-draft"); // Clear draft on success
        closeModal();
        fetchProducts();
      } else {
        toast.error(data.message || "Failed to add product", { id: "product-create" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add product", { id: "product-create" });
    } finally {
      setAddProductLoading(false);
    }
  };

  const closeModal = () => {
    setShowAddProductModal(false);
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      price: "",
      quantity: "",
      lowStockThreshold: 5,
      weight: "1",
      sku: "",
      discountPercentage: 0,
      discountStartDate: "",
      discountEndDate: "",
      isActive: true,
      features: [],
    });
    setSelectedImages([]);
    setModalSubcategories([]);
    setCurrentFeature("");
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
            Loading Products
          </h3>
          <p className="text-gray-600 animate-pulse">
            Fetching your inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-500 mb-1">Products</h1>
          <p className="text-gray-600 text-xs">
            Manage your product inventory and listings
          </p>
        </div>
        <button
          onClick={() => setShowAddProductModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 text-xs bg-linear-to-r from-orange-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          <FiPlus size={18} />
          Add New Product
        </button>
      </div>

      {/* Stats Cards */}
      <div id="products-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs font-medium mb-1">
                Total Products
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.total}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiBox className="text-blue-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs font-medium mb-1">Active</p>
              <h3 className="text-2xl font-bold text-green-600">
                {stats.active}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <FiTrendingUp className="text-green-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs font-medium mb-1">
                Low Stock
              </p>
              <h3 className="text-2xl font-bold text-yellow-600">
                {stats.lowStock}
              </h3>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <FiAlertTriangle className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs font-medium mb-1">
                Out of Stock
              </p>
              <h3 className="text-2xl font-bold text-red-600">
                {stats.outOfStock}
              </h3>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <FiBox className="text-red-600 text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div id="products-filters" className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900 w-full md:min-w-37.5 justify-between"
            >
              <span>
                {selectedCategory
                  ? categories.find((c) => c._id === selectedCategory)?.name
                  : "Category"}
              </span>
              <FiChevronDown />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      setSelectedCategory(cat._id);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowCategoryDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900 w-full md:min-w-37.5 justify-between"
            >
              <span>
                {selectedStatus
                  ? selectedStatus.replace("_", " ").charAt(0).toUpperCase() +
                    selectedStatus.slice(1).replace("_", " ")
                  : "Status"}
              </span>
              <FiChevronDown />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    setSelectedStatus("");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  All Status
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus("active");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  Active
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus("inactive");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  Inactive
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus("low_stock");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  Low Stock
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus("out_of_stock");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                >
                  Out of Stock
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus("promoted");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900 border-t border-gray-100 font-medium text-orange-600"
                >
                  On Promotion 🔥
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div id="products-list" className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <FiPackage className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No products found
          </h3>
          <p className="text-gray-600 mb-6 text-xs">
            Start by adding your first product to your inventory
          </p>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs bg-linear-to-r from-orange-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <FiPlus size={18} />
            Add a Product
          </button>
        </div>
      ) : (
        <div id="products-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const mainImage =
              product.images && product.images.length > 0
                ? product.images[0]
                : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all relative"
              >
                {/* Product Image with Status Badge */}
                <div className="relative h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiPackage className="text-gray-300" size={48} />
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-medium ${stockStatus.color}`}
                    >
                      {stockStatus.label}
                    </span>
                  </div>

                  {/* Promotion Badge */}
                  {product.activeSlashId && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-linear-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 animate-pulse">
                        <FiZap className="w-2.5 h-2.5" />
                        SLASHER
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">
                    {product.name}
                  </h3>

                  {/* NEW: Show category and subcategory */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                    <span>{product.categories?.name || "Uncategorized"}</span>
                    {product.subcategories && (
                      <>
                        <span className="text-gray-300">›</span>
                        <span className="text-green-600 font-medium">
                          {product.subcategories.name}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                      <FiBox size={14} />
                      <span>{product.quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>{product.totalSold || 0} sold</span>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenu(
                            activeMenu === product.id ? null : product.id,
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <FiMoreVertical />
                      </button>

                      {activeMenu === product.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          ></div>

                          <div className="absolute right-0 top-full -mt-50 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-37.5">
                            <Link
                              href={`/dashboard/vendor/products/${product.id}`}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                              onClick={() => setActiveMenu(null)}
                            >
                              <FiEye size={14} />
                              View Details
                            </Link>
                            <Link
                              href={`/dashboard/vendor/products/${product.id}/edit`}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                              onClick={() => setActiveMenu(null)}
                            >
                              <FiEdit2 size={14} />
                              Edit
                            </Link>
                            <button
                              onClick={() => {
                                handleToggleStatus(product);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm text-left"
                            >
                              <FiPackage size={14} />
                              {product.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteProduct(product.id);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-sm text-left rounded-b-lg"
                            >
                              <FiTrash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== ADD PRODUCT MODAL WITH SUBCATEGORY ==================== */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Add New Product
                </h1>
                <p className="text-gray-700 mt-1 text-xs">
                  Fill in the details to add a new product to your store
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <FiX className="text-gray-700" size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddProductSubmit}
              className="lg:p-6 p-4 space-y-8 overflow-y-auto max-h-[70vh]"
            >
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
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
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
                        className="flex-1 text-sm px-4 py-3 placeholder-gray-400 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500"
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

                    {/* NEW: Subcategory Dropdown */}
                    {formData.categoryId && modalSubcategories.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Subcategory{" "}
                          <span className="text-gray-500 text-xs">
                            (Optional)
                          </span>
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
                          {modalSubcategories.map((subcat) => (
                            <option
                              key={subcat._id}
                              value={subcat._id}
                              className="text-gray-900"
                            >
                              {subcat.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Select a subcategory for better organization
                        </p>
                      </div>
                    )}

                    <div
                      className={
                        formData.categoryId && modalSubcategories.length > 0
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
                          handleInputChange(
                            "isActive",
                            e.target.value === "true",
                          )
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        handleInputChange("price", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleInputChange("quantity", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleInputChange("lowStockThreshold", e.target.value)
                      }
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.weight}
                      onChange={(e) =>
                        handleInputChange("weight", e.target.value)
                      }
                      placeholder="e.g. 1.5"
                      className="w-full text-gray-900 px-4 py-3 border outline-none text-sm h-11 border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
              </div>

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
                          handleInputChange(
                            "discountPercentage",
                            e.target.value,
                          )
                        }
                        placeholder="0"
                        className="w-full text-gray-900 px-4 outline-none text-sm h-11 py-3 border border-gray-300 rounded-lg focus:ring-0.5 focus:ring-orange-500 focus:border-orange-500 transition-colors placeholder-gray-400"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      0 = No discount
                    </p>
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
                          <span className="font-semibold">
                            Discounted Price:
                          </span>{" "}
                          {formatCurrency(
                            formData.price *
                              (1 - formData.discountPercentage / 100),
                          )}
                        </p>
                        {(formData.discountStartDate ||
                          formData.discountEndDate) && (
                          <p className="text-xs text-gray-600 mt-2">
                            {formData.discountStartDate &&
                              `Starts: ${new Date(
                                formData.discountStartDate,
                              ).toLocaleString()}`}
                            {formData.discountStartDate &&
                              formData.discountEndDate &&
                              " | "}
                            {formData.discountEndDate &&
                              `Ends: ${new Date(
                                formData.discountEndDate,
                              ).toLocaleString()}`}
                          </p>
                        )}
                      </div>
                      <div className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold">
                        {formData.discount_percentage}% OFF
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
                  Upload up to 5 images (max 5MB each)
                </p>

                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={typeof image === "string" ? image : URL.createObjectURL(image)}
                          alt="preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX size={16} />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-orange-400 transition-colors">
                  <FiUpload className="mx-auto text-gray-400 mb-4" size={35} />
                  <p className="text-gray-700 font-medium text-sm mb-2">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mb-6">
                    JPG, PNG, WEBP (max 5MB each)
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="modal-image-upload"
                    disabled={selectedImages.length >= 5}
                  />
                  <label
                    htmlFor="modal-image-upload"
                    className={`inline-block px-8 py-2.5 text-xs rounded-lg font-semibold cursor-pointer transition-colors ${
                      selectedImages.length >= 5
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    {selectedImages.length >= 5
                      ? "Max 5 images reached"
                      : "Choose Files"}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-8 py-2.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addProductLoading}
                  className={`px-8 py-2.5 text-xs rounded-lg font-medium text-white flex items-center gap-3 transition-all ${
                    addProductLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : isOffline
                      ? "bg-yellow-500 hover:bg-yellow-600 shadow-md"
                      : "bg-linear-to-r from-orange-500 to-green-600 hover:shadow-xl"
                  }`}
                >
                  {addProductLoading ? (
                    <>Adding...</>
                  ) : isOffline ? (
                    <>
                      <FiZap />
                      Save Offline Draft
                    </>
                  ) : (
                    <>
                      <FiPackage />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
