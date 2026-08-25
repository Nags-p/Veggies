"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Plus, Minus, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { useData } from "@/context/DataContext";

export type Product = {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price: number;
  discount: number;
  weight: string;
  stock: number;
  freshness_badge?: string;
  delivery_time: string;
  images: string[];
  is_organic?: boolean;
  is_seasonal?: boolean;
  is_exotic?: boolean;
};

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { cart, addToCart } = useCart();
  const { isStoreOpen } = useStore();
  const { wishlist, toggleWishlist } = useData();

  const isLiked = wishlist.includes(product.id);

  const cartItem = cart.find((item) => item.product.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    const newQty = 1;
    addToCart(product, newQty);
    if (onAddToCart) onAddToCart(product, newQty);
  };

  const handleIncrement = () => {
    const newQty = quantity + 1;
    if (newQty <= product.stock) {
      addToCart(product, newQty);
      if (onAddToCart) onAddToCart(product, newQty);
    }
  };

  const handleDecrement = () => {
    const newQty = quantity - 1;
    addToCart(product, newQty);
    if (onAddToCart) onAddToCart(product, newQty);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative flex flex-col justify-between bg-card rounded-xl p-4 shadow-card hover:shadow-premium border border-slate-100/80 overflow-hidden group w-full"
    >
      {/* Badge & Favorite Button */}
      <div className="flex justify-between items-start mb-2">
        <span />
        <button
          onClick={() => toggleWishlist(product.id)}
          className="p-1.5 rounded-full bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-colors duration-150"
        >
          <Heart
            className={`h-4.5 w-4.5 transition-transform duration-200 active:scale-75 ${
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            }`}
          />
        </button>
      </div>

      {/* Product Image */}
      <Link href={`/product?slug=${product.slug}`} className="block">
        <div className="relative w-full h-32 mb-3 bg-slate-50/50 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer">
          <Image
            src={product.images[0] || "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=200"}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            priority={false}
          />
        </div>
      </Link>

      {/* Info */}
      <div className="space-y-1">
        {/* Delivery Time */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
          <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{product.delivery_time || "10 mins"}</span>
        </div>

        {/* Product Name */}
        <Link href={`/product?slug=${product.slug}`} className="block">
          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug hover:text-primary transition-colors duration-150 cursor-pointer">
            {product.name}
          </h3>
        </Link>

        {/* Weight */}
        <p className="text-xs text-slate-500 font-medium">{product.weight}</p>
      </div>

      {/* Price and Actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              ₹{product.price}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-slate-400 line-through">
                ₹{product.original_price}
              </span>
            )}
          </div>
          {product.discount > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary-light/10 px-1.5 py-0.5 rounded-md w-fit">
              {product.discount.toFixed(0)}% OFF
            </span>
          )}
        </div>

        {/* ADD Button or Quantity Selector */}
        <div className="min-w-[80px]">
          <AnimatePresence mode="wait">
            {quantity === 0 ? (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleAdd}
                disabled={!isStoreOpen}
                className="w-full bg-white border border-primary text-primary font-bold text-sm px-3 py-2 rounded-button hover:bg-primary hover:text-white shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStoreOpen ? "ADD" : "CLOSED"}
              </motion.button>
            ) : (
              <motion.div
                key="quantity-selector"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-between w-full bg-primary text-white font-bold text-sm rounded-button overflow-hidden shadow-sm"
              >
                <button
                  onClick={handleDecrement}
                  className="px-2.5 py-2 hover:bg-primary-dark transition-colors duration-150"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="select-none text-xs">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock || !isStoreOpen}
                  className="px-2.5 py-2 hover:bg-primary-dark transition-colors duration-150 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stock warning */}
      {product.stock <= 5 && product.stock > 0 && (
        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
          Only {product.stock} left
        </span>
      )}
      {product.stock === 0 && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
            Out of Stock
          </span>
        </div>
      )}
    </motion.div>
  );
}
