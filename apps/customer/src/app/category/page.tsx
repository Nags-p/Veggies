"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  ArrowUpDown,
  Leaf,
  Calendar,
  Loader2,
  ArrowLeft,
  Search,
  Share2,
  ChevronDown,
  Heart,
  Zap
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import ProductCard, { Product } from "@/components/ProductCard";
import FooterNav from "@/components/FooterNav";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useData } from "@/context/DataContext";

function CategoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { location, setShowLocationModal } = useLocation();
  const { products: dbProducts, categories: rawCategories, dbLoading } = useData();

  // Filter out categories that have no products (except 'all')
  const sidebarCategories = rawCategories.filter((cat) => {
    if (cat.id === "all") return true;
    return dbProducts.some((p) => p.category_id === cat.id);
  });

  // Selected Category State
  const [activeCategory, setActiveCategory] = useState({
    id: "all",
    name: "All",
    slug: "all",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=150",
    dbCategoryId: null
  });

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState<"popular" | "low-high" | "high-low">("popular");


  useEffect(() => {
    const slug = searchParams.get("selected");
    if (slug && sidebarCategories.length > 1) {
      const match = sidebarCategories.find((c) => c.slug === slug);
      if (match) setActiveCategory(match);
    }
  }, [searchParams, sidebarCategories]);

  const handleCategorySelect = (category: any) => {
    setActiveCategory(category);
    router.replace(`/category?selected=${category.slug}`);
  };

  // Combine DB products for filtering
  const getFilteredProducts = () => {
    let list: Product[] = [];

    // Filter by Category
    if (activeCategory.id === "all") {
      list = [...dbProducts];
    } else if (activeCategory.dbCategoryId) {
      list = dbProducts.filter((p) => p.category_id === activeCategory.dbCategoryId);
    } else {
      list = [];
    }

    // Apply Search
    if (searchQuery) {
      list = list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }



    // Apply Sorting
    if (sortOption === "low-high") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === "high-low") {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  };

  const displayedProducts = getFilteredProducts();

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading fresh produce...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5]">
      {/* ========================================================== */}
      {/* MOBILE LIGHT UI (Viewport < md) */}
      {/* ========================================================== */}
      <div className="md:hidden h-screen flex flex-col bg-[#F4F7F5] text-slate-800 overflow-hidden">
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 py-3 px-4 flex items-center justify-between gap-2 shadow-sm">
          {/* Back Icon */}
          <Link href="/">
            <button className="p-1 rounded-full hover:bg-slate-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-800" />
            </button>
          </Link>

          {/* Delivery Location Column */}
          <div className="flex-1 flex flex-col px-2 min-w-0 text-left">
            <span className="text-slate-800 font-extrabold text-sm leading-tight">
              Vegetables & Fruits
            </span>
            <div
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-0.5 mt-0.5 cursor-pointer"
            >
              <span className="text-primary font-extrabold text-[9px] whitespace-nowrap">
                Delivering to Home:
              </span>
              <span className="text-slate-500 font-bold text-[9px] truncate max-w-[140px]">
                {location ? location.address : "Select Location..."}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" />
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Search className="h-4.5 w-4.5 text-slate-700" />
            </button>
            <button className="p-1 rounded-full hover:bg-slate-100 transition-colors">
              <Share2 className="h-4.5 w-4.5 text-slate-700" />
            </button>
          </div>
        </header>

        {/* Collapsible Mobile Search Input */}
        {isSearchOpen && (
          <div className="p-3 bg-white border-b border-slate-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search 'fresh tomato', 'apple', 'organic'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary transition-all shadow-inner"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Scroll Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none">
          {/* Sort selector toggle */}
          <button
            onClick={() => {
              if (sortOption === "popular") setSortOption("low-high");
              else if (sortOption === "low-high") setSortOption("high-low");
              else setSortOption("popular");
            }}
            className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold border transition-colors duration-150 ${
              sortOption !== "popular"
                ? "bg-primary/10 border-primary text-primary"
                : "bg-slate-50 border-slate-200/80 text-slate-700"
            }`}
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>
              {sortOption === "popular"
                ? "Sort"
                : sortOption === "low-high"
                ? "Price: Low to High"
                : "Price: High to Low"}
            </span>
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Categories Sidebar + Product Grid Container */}
        <div className="flex flex-row flex-1 overflow-hidden">
          {/* Left: Sidebar Navigation */}
          <aside className="w-20 flex-shrink-0 overflow-y-auto scrollbar-none pb-24 bg-[#EBF0EC] border-r border-slate-200/60">
            <nav className="flex flex-col">
              {sidebarCategories.map((cat) => {
                const isActive = activeCategory.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={`w-full py-4 px-1 flex flex-col items-center justify-center relative border-b border-slate-200/20 transition-colors ${
                      isActive ? "bg-[#DFEBE3]" : ""
                    }`}
                  >
                    {/* Active vertical bar on the left */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r" />
                    )}

                    {/* Circular Icon Image */}
                    <div
                      className={`w-12 h-12 rounded-full overflow-hidden border mb-1.5 transition-all ${
                        isActive
                          ? "border-primary scale-105 shadow-md shadow-primary/10"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Category Label */}
                    <span
                      className={`text-[9px] font-black text-center leading-tight tracking-tight max-w-[70px] ${
                        isActive ? "text-primary" : "text-slate-500"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right: Scrollable Content Pane */}
          <section className="flex-1 overflow-y-auto scrollbar-none p-3 pb-24 bg-[#F4F7F5] space-y-3.5">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#E8F5E9] to-[#C8E6C9] border border-[#A5D6A7]/40 rounded-xl p-3 flex justify-between items-center relative overflow-hidden shadow-sm">
              <div className="z-10 flex-1 pr-2">
                <h2 className="text-[#145A22] text-xs font-black uppercase tracking-wide">
                  {activeCategory.name}
                </h2>
                <p className="text-[#2E7D32] text-[9px] font-bold leading-snug mt-1 max-w-[170px]">
                  {activeCategory.id === "all"
                    ? "Fresh selections handpicked for you daily."
                    : activeCategory.name === "Fresh Fruits" || activeCategory.name === "Seasonal"
                    ? "Fresh seasonal fruits\nNutritional goodness in every bite."
                    : "Fresh daily produce sourced directly from local partner farms."}
                </p>
              </div>
              <div className="relative w-16 h-12 flex-shrink-0">
                <img
                  src={activeCategory.imageUrl}
                  alt={activeCategory.name}
                  className="w-full h-full object-contain rounded-md filter drop-shadow-sm"
                />
              </div>
            </div>

            {/* 2-Column Product Grid */}
            {displayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {displayedProducts.map((product) => (
                  <MobileLightProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
                <span className="text-2xl">🥬</span>
                <h3 className="text-xs font-bold text-slate-800">No products found</h3>
                <p className="text-[10px] text-slate-500 max-w-[160px] mx-auto leading-tight">
                  Try adjusting filters or search query for {activeCategory.name}.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Mobile footer navigation handled globally via FooterNav */}
        <FooterNav />
      </div>

      {/* ========================================================== */}
      {/* DESKTOP LIGHT UI (Viewport >= md) */}
      {/* ========================================================== */}
      <div className="hidden md:block min-h-screen pb-16 sm:pb-8 bg-background">
        <Header onSearch={setSearchQuery} />

        <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex gap-6">
          {/* Sticky Left Sidebar Categories */}
          <aside className="w-56 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-y-auto bg-card rounded-xl p-3 shadow-card border border-slate-100/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-3 block">
              Categories
            </span>
            <nav className="space-y-1">
              {sidebarCategories.map((cat) => {
                const isSelected = activeCategory.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                      isSelected
                        ? "bg-primary text-white shadow-premium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-slate-100">
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    </div>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 space-y-6">
            {/* Top Filters bar */}
            <div className="bg-card p-4 rounded-xl shadow-card border border-slate-100/80 flex flex-wrap gap-4 items-center justify-between">
              {/* Left: Category Title */}
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100">
                    <img src={activeCategory.imageUrl} alt={activeCategory.name} className="w-full h-full object-cover" />
                  </div>
                  <span>{activeCategory.name}</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  {displayedProducts.length} items found
                </p>
              </div>

              {/* Right: Filter Buttons */}
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Sort selector */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="bg-transparent border-none outline-none cursor-pointer focus:ring-0"
                  >
                    <option value="popular">Popularity</option>
                    <option value="low-high">Price: Low to High</option>
                    <option value="high-low">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <AnimatePresence mode="wait">
              {displayedProducts.length > 0 ? (
                <motion.div
                  key={activeCategory.id + sortOption}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {displayedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center space-y-2 bg-card rounded-xl border border-dashed border-slate-200 shadow-card"
                >
                  <span className="text-3xl">🥦</span>
                  <h3 className="text-base font-extrabold text-slate-800">No products found</h3>
                  <p className="text-xs text-slate-400 max-w-[220px]">
                    Try adjusting your filters or search keywords to see available products.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <FooterNav />
      </div>
    </div>
  );
}

// Customized light-themed mobile product card matching the design exactly
function MobileLightProductCard({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);
  const { cart, addToCart } = useCart();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addToCart(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (quantity < product.stock) {
      addToCart(product, quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addToCart(product, quantity - 1);
  };

  // Carbide Free tag removed per user request
  const badgeText = "";

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden group select-none shadow-sm">
      {/* Top overlay badges & heart */}
      <div className="flex justify-end items-start w-full absolute top-2 left-0 px-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="p-1 rounded-full bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-colors"
        >
          <Heart
            className={`h-3 w-3 transition-transform active:scale-75 ${
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            }`}
          />
        </button>
      </div>

      {/* Product Image Container */}
      <Link href={`/product?slug=${product.slug}`} className="block">
        <div className="relative w-full aspect-square mb-2 bg-slate-50/50 rounded-lg overflow-hidden flex items-center justify-center pt-2 cursor-pointer">
          <img
            src={product.images[0] || "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=200"}
            alt={product.name}
            className="object-contain w-full h-[85%] p-1 group-hover:scale-105 transition-transform duration-300"
          />
          {/* Carousel indicators */}
          <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-slate-800/30"></span>
          </div>
        </div>
      </Link>


      {/* Weight & Add Action Container Row */}
      <div className="bg-[#F1F5F2] rounded-lg p-1.5 flex justify-between items-center gap-1.5 mb-1.5 min-h-[38px]">
        <span className="text-slate-655 text-[10px] font-extrabold truncate max-w-[70px] pl-1">
          {product.weight.split(" (")[0]}
        </span>
        <div className="flex-shrink-0">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="border-2 border-primary text-primary font-black text-xs px-4 py-1.5 rounded-md hover:bg-primary hover:text-white transition-all bg-white shadow-sm"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center bg-primary text-white rounded-md overflow-hidden text-xs font-black border border-primary">
              <button
                onClick={handleDecrement}
                className="px-2.5 py-1.5 hover:bg-primary-dark transition-colors"
              >
                -
              </button>
              <span className="px-2 text-xs">{quantity}</span>
              <button
                onClick={handleIncrement}
                disabled={quantity >= product.stock}
                className="px-2.5 py-1.5 hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-0.5">
        <span className="text-slate-900 text-xs font-black">₹{product.price}</span>
        {product.discount > 0 && (
          <span className="text-slate-400 text-[9px] line-through">₹{product.original_price}</span>
        )}
      </div>

      {/* Title */}
      <Link href={`/product?slug=${product.slug}`} className="block">
        <h3 className="text-slate-800 text-[10px] font-bold leading-tight line-clamp-2 min-h-[24px] mb-1 hover:text-primary transition-colors cursor-pointer">
          {product.name}
        </h3>
      </Link>

      {/* Delivery details and stock status */}
      <div className="flex items-center justify-between text-[8px] text-slate-500 border-t border-slate-100 pt-1">
        <div className="flex items-center gap-0.5 font-semibold">
          <Zap className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span>{product.delivery_time || "15 mins"}</span>
        </div>
        {product.stock <= 5 && product.stock > 0 ? (
          <span className="text-[#E65100] font-extrabold">{product.stock} left</span>
        ) : product.stock === 0 ? (
          <span className="text-[#C62828] font-extrabold">OOS</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F5]">
        <span className="text-primary font-bold animate-pulse">Loading Categories...</span>
      </div>
    }>
      <CategoryPageContent />
    </Suspense>
  );
}
