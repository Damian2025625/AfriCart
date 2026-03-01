"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowRight, FiSearch, FiX } from "react-icons/fi";
import { LuApple, LuPaintbrushVertical, LuCar, LuBookCopy, LuCoffee, LuSmartphone, LuDumbbell, LuBaby, LuLeaf, LuWrench, LuHeart, LuSprout, LuBox } from "react-icons/lu";
import { IoShirtOutline, IoSparklesOutline } from "react-icons/io5";

const categoryStyles = [
  {
    gradient: "from-orange-600/80 to-orange-800/80",
    bg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
    icon: <IoShirtOutline className="text-xl text-white" />,
  },
  {
    gradient: "from-teal-600/80 to-cyan-700/80",
    bg: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    icon: <LuSmartphone className="text-xl text-white" />,
  },
  {
    gradient: "from-green-600/80 to-green-800/80",
    bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    icon: <LuApple className="text-xl text-white" />,
  },
  {
    gradient: "from-purple-600/80 to-purple-800/80",
    bg: "https://images.unsplash.com/photo-1759607236409-1df137ecb3b6?q=80&w=688&auto=format&fit=crop",
    icon: <IoSparklesOutline className="text-xl text-white" />,
  },
  {
    gradient: "from-gray-700/80 to-gray-900/80",
    bg: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
    icon: <LuCar className="text-xl text-white" />,
  },
  {
    gradient: "from-purple-500/80 to-pink-600/80",
    bg: "https://images.unsplash.com/photo-1581462700959-99ee74a9bc6d?q=80&w=687&auto=format&fit=crop",
    icon: <LuBookCopy className="text-xl text-white" />,
  },
  {
    gradient: "from-blue-500/80 to-blue-700/80",
    bg: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
    icon: <LuCoffee className="text-xl text-white" />,
  },
  {
    gradient: "from-pink-600/80 to-red-700/80",
    bg: "https://images.unsplash.com/photo-1581122584612-713f89daa8eb?w=800&q=80",
    icon: <LuDumbbell className="text-xl text-white" />,
  },
  {
    gradient: "from-yellow-600/80 to-amber-700/80",
    bg: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
    icon: <LuBaby className="text-xl text-white" />,
  },
  {
    gradient: "from-violet-600/80 to-indigo-700/80",
    bg: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    icon: <LuLeaf className="text-xl text-white" />,
  },
  {
    gradient: "from-lime-600/80 to-green-700/80",
    bg: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
    icon: <LuSprout className="text-xl text-white" />,
  },
  {
    gradient: "from-rose-600/80 to-pink-700/80",
    bg: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
    icon: <LuPaintbrushVertical className="text-xl text-white" />,
  },
  {
    gradient: "from-indigo-600/80 to-purple-700/80",
    bg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    icon: <LuWrench className="text-xl text-white" />,
  },
  {
    gradient: "from-slate-600/80 to-zinc-700/80",
    bg: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
    icon: <LuBox className="text-xl text-white" />,
  },
];

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Shop by Category
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {categories.length} categories available
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500 text-sm">
            No categories found{searchTerm ? ` for "${searchTerm}"` : ""}.
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 text-orange-500 hover:text-orange-600 text-sm font-semibold"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((category, index) => {
            const style = categoryStyles[index % categoryStyles.length];

            return (
              <Link
                key={category._id}
                href={`/dashboard/customer/categories/${category._id}`}
                className="group relative h-40 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Background image + gradient */}
                <div className="absolute inset-0">
                  <img
                    src={style.bg}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-linear-to-br ${style.gradient}`}></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-4">
                  {/* Icon top-right */}
                  <div className="self-end">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      {style.icon}
                    </div>
                  </div>

                  {/* Name + count bottom */}
                  <div className="text-white">
                    <h3 className="text-base font-bold mb-1 leading-tight">
                      {category.name}
                    </h3>
                    <p className="text-xs text-white/90 flex items-center gap-1">
                      <span>{category.product_count || 0}+ products</span>
                      <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
