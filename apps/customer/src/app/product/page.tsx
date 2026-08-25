"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Heart, Shield, RefreshCw, ShoppingCart, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/context/CartContext";
import FooterNav from "@/components/FooterNav";

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price: number;
  discount: number;
  weight: string;
  stock: number;
  delivery_time: string;
  images: string[];
  is_organic?: boolean;
  is_seasonal?: boolean;
  is_exotic?: boolean;
}

function ProductDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const supabase = createClient();
  const { cart, addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function fetchProduct() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .eq("is_hidden", false)
          .single();

        if (!error && data) {
          setProduct({
            ...data,
            price: parseFloat(data.price),
            original_price: parseFloat(data.original_price),
            discount: parseFloat(data.discount)
          });
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-5xl block mb-4">🔍</span>
        <h2 className="text-lg font-black text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-400 max-w-[240px] mt-1.5">
          The product you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-6 bg-primary text-white font-extrabold text-xs px-6 py-2.5 rounded-button shadow-premium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const cartItem = cart.find((item) => item.product.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-12">
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Product Details</h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-none">Fresh farm produce delivered in 10 mins</p>
          </div>
        </div>

        {/* Details card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-2xl border border-slate-100/80 p-5 md:p-8 shadow-card">
          {/* Product Image Section */}
          <div className="relative w-full aspect-square bg-slate-50/50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100/50 p-6 group">
            <img
              src={product.images?.[0] || "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=400"}
              alt={product.name}
              className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300"
            />
            {/* Absolute Badges */}
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm cursor-pointer z-10"
            >
              <Heart
                className={`h-4.5 w-4.5 transition-transform duration-200 active:scale-75 ${
                  isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
                }`}
              />
            </button>
          </div>

          {/* Product Info Section */}
          <div className="flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="bg-slate-50 text-slate-500 border border-slate-150 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="h-3 w-3 fill-amber-400 text-amber-400 border-none" />
                  {product.delivery_time || "10 mins"}
                </span>
              </div>

              {/* Title & Weight */}
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {product.name}
                </h2>
                <p className="text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 w-fit border border-slate-100">
                  Pack Size: {product.weight}
                </p>
              </div>

              {/* Price Details */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-2xl font-black text-slate-900">₹{product.price}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      MRP ₹{product.original_price}
                    </span>
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-md border border-primary/20">
                      {product.discount.toFixed(0)}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Product Information</h4>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  {product.description || `Sourced daily from certified local partner farms. Carefully cleaned, quality-checked, and safely packed to preserve peak nutritional value, freshness, and crunch. Best stored in refrigerator.`}
                </p>
              </div>
            </div>

            {/* Cart ADD Actions */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  {quantity === 0 ? (
                    <button
                      onClick={() => addToCart(product as any, 1)}
                      className="w-full bg-primary hover:bg-primary-dark text-white font-black text-xs py-3.5 px-6 rounded-button shadow-premium flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform"
                    >
                      <ShoppingCart className="h-4.5 w-4.5" /> ADD TO CART
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full bg-primary text-white font-black text-xs rounded-button overflow-hidden shadow-premium border border-primary">
                      <button
                        onClick={() => addToCart(product as any, quantity - 1)}
                        className="px-6 py-3.5 hover:bg-primary-dark transition-colors cursor-pointer text-sm"
                      >
                        -
                      </button>
                      <span className="select-none text-xs">{quantity} in cart</span>
                      <button
                        onClick={() => quantity < product.stock && addToCart(product as any, quantity + 1)}
                        disabled={quantity >= product.stock}
                        className="px-6 py-3.5 hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Guarantee list */}
              <div className="grid grid-cols-2 gap-3 text-[9px] font-bold text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-500" /> Safe & Hygienic Packaging
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-emerald-500" /> Freshness Guarantee
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterNav />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading product page...</p>
      </div>
    }>
      <ProductDetailsContent />
    </Suspense>
  );
}
