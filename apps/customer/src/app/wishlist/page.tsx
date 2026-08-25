"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import ProductCard from "@/components/ProductCard";
import FooterNav from "@/components/FooterNav";

export default function WishlistPage() {
  const router = useRouter();
  const { products, wishlist, dbLoading, profile, profileLoading } = useData();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  if (dbLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 pt-4 text-left">
      <main className="max-w-md mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 py-2 border-b border-slate-100">
          <button 
            onClick={() => router.back()} 
            className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-slate-800" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Your Wishlist</h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-none">
              {wishlistedProducts.length} {wishlistedProducts.length === 1 ? "item" : "items"} saved
            </p>
          </div>
        </div>

        {!profile ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
              <Heart className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Please Log In</h3>
              <p className="text-xs text-slate-400 font-semibold px-4">
                You need to sign in to save products and view your personal wishlist.
              </p>
            </div>
            <Link href="/login">
              <button className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-premium cursor-pointer transition-transform active:scale-[0.98]">
                Login / Sign Up
              </button>
            </Link>
          </div>
        ) : wishlistedProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
              <Heart className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Your Wishlist is Empty</h3>
              <p className="text-xs text-slate-400 font-semibold px-4">
                Save your favorite fresh veggies and fruits here to order them easily later.
              </p>
            </div>
            <Link href="/">
              <button className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-premium cursor-pointer transition-transform active:scale-[0.98]">
                Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </main>

      <FooterNav />
    </div>
  );
}
