"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Compass, Flame, ShoppingBag, ArrowRight, Loader2, MapPinOff, Clock } from "lucide-react";
import Header from "@/components/Header";
import ProductCard, { Product } from "@/components/ProductCard";
import FooterNav from "@/components/FooterNav";
import { useLocation } from "@/context/LocationContext";
import { useStore } from "@/context/StoreContext";
import { useData } from "@/context/DataContext";



export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isServiceable, loadingLocation, setShowLocationModal } = useLocation();
  const { isStoreOpen, storeTimings, storeStatus } = useStore();
  const { products, categories, dbLoading } = useData();

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  return (
    <div className="min-h-screen pb-16 sm:pb-8 bg-background">
      <Header onSearch={setSearchQuery} />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {!isServiceable ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-5 bg-card border border-slate-100 rounded-2xl shadow-card max-w-xl mx-auto px-6"
          >
            <div className="p-4 bg-red-50 text-red-500 rounded-full">
              <MapPinOff className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-800">Out of Serviceable Area</h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Veggies is currently not delivering to your area. We hope to expand to your location soon!
              </p>
            </div>
            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-6 py-3 rounded-button shadow-premium transition-all duration-150 cursor-pointer"
            >
              Select Different Location
            </button>
          </motion.div>
        ) : (
          <>
            {/* Store Closed Warning */}
            {!isStoreOpen && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3.5 items-start text-xs text-red-700 font-bold shadow-sm">
                <Clock className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="block font-black text-sm text-red-800">
                    {storeStatus?.is_open === false ? "Store is Temporarily Closed" : "Store is Currently Closed"}
                  </span>
                  <span className="block font-medium text-red-650 mt-1 leading-relaxed">
                     We are currently not accepting new orders. Our timings are {storeTimings?.open_time || "08:00"} - {storeTimings?.close_time || "22:00"} ({storeTimings?.days || "Mon - Sun"}).
                  </span>
                </div>
              </div>
            )}

            {/* Search Results Display */}
            {searchQuery && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Search results for &quot;{searchQuery}&quot; ({filteredProducts.length} items)
                </h2>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No products found matching your search.</p>
                )}
              </div>
            )}

            {/* Regular Homepage Layout */}
            {!searchQuery && (
              <>
                {/* Hero Promo Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="relative rounded-xl overflow-hidden bg-gradient-to-r from-primary to-secondary text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-premium"
                >
                  <div className="space-y-4 max-w-xl text-center md:text-left z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                      Get Fresh Fruits & Vegetables in <span className="text-accent">10 Mins!</span>
                    </h1>
                    <p className="text-white/80 text-sm md:text-base font-medium max-w-md">
                      Sourced straight from the farms. Freshness guaranteed. Delivered to your doorstep!
                    </p>
                    <div className="pt-2 flex justify-center md:justify-start gap-4">
                      <Link href="/category">
                        <button className="bg-white text-primary hover:bg-slate-50 font-extrabold text-sm px-6 py-3 rounded-button shadow transition-all duration-150 flex items-center gap-1.5 group cursor-pointer">
                          Shop Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Floating Graphic element */}
                  <div className="relative w-64 h-48 md:w-80 md:h-56 hidden md:block">
                    <Image
                      src="https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400"
                      alt="Veggies Hero"
                      fill
                      className="object-cover rounded-xl shadow-premium border-2 border-white/20"
                    />
                  </div>
                </motion.div>

                {/* Circular Categories List */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" /> Browse Categories
                    </h2>
                    <Link href="/category" className="text-sm font-bold text-primary hover:text-primary-dark">
                      See All
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {dbLoading ? (
                      [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 text-center border border-slate-100/80 animate-pulse space-y-3">
                          <div className="bg-slate-200 rounded-full w-14 h-14 mx-auto" />
                          <div className="h-3 bg-slate-200 rounded w-16 mx-auto" />
                          <div className="h-2 bg-slate-200 rounded w-10 mx-auto" />
                        </div>
                      ))
                    ) : (
                      categories.map((cat, index) => (
                        <Link key={cat.slug} href={`/category?selected=${cat.slug}`}>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-card rounded-xl p-4 text-center cursor-pointer border border-slate-100 hover:border-accent/30 shadow-card hover:shadow transition-all duration-150 space-y-2 group"
                          >
                            <div className="relative w-14 h-14 rounded-full overflow-hidden mx-auto border border-slate-100 bg-slate-50 group-hover:border-primary/20 transition-all duration-150">
                              <Image
                                src={cat.imageUrl}
                                alt={cat.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-700 leading-tight group-hover:text-primary transition-colors">
                                {cat.name}
                              </h3>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {cat.count}
                              </span>
                            </div>
                          </motion.div>
                        </Link>
                      ))
                    )}
                  </div>
                </section>

                {/* Flash Sale Section */}
                <section className="space-y-4 bg-amber-50/40 border border-amber-100/50 p-5 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <h2 className="text-lg md:text-xl font-extrabold text-slate-800">
                        Flash Sale
                      </h2>
                      <span className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Ending Soon
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dbLoading ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-slate-100/80 animate-pulse space-y-4">
                          <div className="bg-slate-200 h-32 w-full rounded-xl" />
                          <div className="space-y-2">
                            <div className="h-3.5 bg-slate-200 rounded w-3/4 animate-none" />
                            <div className="h-3 bg-slate-200 rounded w-1/2 animate-none" />
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div className="h-5 bg-slate-200 rounded w-16 animate-none" />
                            <div className="h-8 bg-slate-200 rounded w-20 animate-none" />
                          </div>
                        </div>
                      ))
                    ) : (
                      products
                        .filter((p) => p.discount >= 24)
                        .map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))
                    )}
                  </div>
                </section>

                {/* Today's Deals (Popular) */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" /> Today&apos;s Deals
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dbLoading ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-slate-100/80 animate-pulse space-y-4">
                          <div className="bg-slate-200 h-32 w-full rounded-xl" />
                          <div className="space-y-2">
                            <div className="h-3.5 bg-slate-200 rounded w-3/4 animate-none" />
                            <div className="h-3 bg-slate-200 rounded w-1/2 animate-none" />
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div className="h-5 bg-slate-200 rounded w-16 animate-none" />
                            <div className="h-8 bg-slate-200 rounded w-20 animate-none" />
                          </div>
                        </div>
                      ))
                    ) : (
                      products.slice(0, 5).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))
                    )}
                  </div>
                </section>

                {/* Exotic Recommendations Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1 */}
                  <div className="relative rounded-xl overflow-hidden bg-emerald-950 text-white p-6 flex flex-row items-center justify-between gap-4 shadow-premium border border-emerald-900">
                    <div className="space-y-2 z-10">
                      <span className="text-[10px] font-bold text-accent tracking-wider uppercase">
                        Exotic Eats
                      </span>
                      <h3 className="text-lg font-extrabold">
                        Broccoli, Avocados & More
                      </h3>
                      <p className="text-emerald-200/80 text-xs max-w-[200px]">
                        Indulge in premium global items sourced locally.
                      </p>
                      <Link href="/category?selected=exotic-veggies" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-white pt-2">
                        Shop Exotics <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="relative w-32 h-28 flex-shrink-0">
                      <Image
                        src="https://images.unsplash.com/photo-1568584711075-3d021a7c3ecf?q=80&w=200"
                        alt="Exotics"
                        fill
                        className="object-cover rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="relative rounded-xl overflow-hidden bg-green-900 text-white p-6 flex flex-row items-center justify-between gap-4 shadow-premium border border-green-800">
                    <div className="space-y-2 z-10">
                      <span className="text-[10px] font-bold text-accent tracking-wider uppercase">
                        Certified Organic
                      </span>
                      <h3 className="text-lg font-extrabold">
                        Pure & Chemical-Free
                      </h3>
                      <p className="text-green-200/80 text-xs max-w-[200px]">
                        Eat healthy. Sourced from certified organic farms.
                      </p>
                      <Link href="/category?selected=organic-greens" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-white pt-2">
                        Shop Organic <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="relative w-32 h-28 flex-shrink-0">
                      <Image
                        src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=200"
                        alt="Organic"
                        fill
                        className="object-cover rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Popular / Recommended Products */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-primary" /> Recommended for You
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dbLoading ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-slate-100/80 animate-pulse space-y-4">
                          <div className="bg-slate-200 h-32 w-full rounded-xl" />
                          <div className="space-y-2">
                            <div className="h-3.5 bg-slate-200 rounded w-3/4 animate-none" />
                            <div className="h-3 bg-slate-200 rounded w-1/2 animate-none" />
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div className="h-5 bg-slate-200 rounded w-16 animate-none" />
                            <div className="h-8 bg-slate-200 rounded w-20 animate-none" />
                          </div>
                        </div>
                      ))
                    ) : (
                      products.slice(5, 10).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>

      <FooterNav />
    </div>
  );
}
