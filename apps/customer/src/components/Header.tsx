"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Bell, User, ShoppingCart, ChevronDown } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  onSearch?: (query: string) => void;
  hideSearch?: boolean;
}

export default function Header({ onSearch, hideSearch }: HeaderProps) {
  const { location, isServiceable, setShowLocationModal } = useLocation();
  const { itemsCount } = useCart();
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let channel: any;

    async function fetchUnreadCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("read", false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }

      // Realtime subscription
      if (channel) {
        supabase.removeChannel(channel);
      }
      channel = supabase
        .channel(`header-notifications-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `profile_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();
    }

    fetchUnreadCount();

    // Re-run on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUnreadCount();
      } else if (event === "SIGNED_OUT") {
        setUnreadCount(0);
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      }
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm py-3 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brand logo & Delivery Address */}
        <div className="flex items-center justify-between md:justify-start gap-6">
          <Link href="/">
            <span className="text-2xl font-extrabold text-primary tracking-tight cursor-pointer">
              Veggies
            </span>
          </Link>

          <div 
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-55 p-1.5 rounded-xl transition-all duration-150 border border-slate-50 hover:border-slate-100"
          >
            <div className={`p-1.5 rounded-full ${!isServiceable ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 ${!isServiceable ? "text-red-600" : "text-primary"}`}>
                {!isServiceable ? "Unserviceable" : "Delivery in 10 mins"} <ChevronDown className="h-3 w-3" />
              </span>
              <span className="text-xs font-bold text-slate-700 max-w-[150px] md:max-w-[200px] truncate">
                {location ? location.address : "Select Delivery Location..."}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        {!hideSearch ? (
          <div className="flex-1 max-w-2xl w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search 'fresh tomato', 'apple', 'organic'..."
              onChange={(e) => onSearch?.(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white transition-all duration-150 shadow-inner"
            />
          </div>
        ) : (
          <div className="flex-1 max-w-2xl" />
        )}

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Notifications */}
          <Link href="/notifications" className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors duration-150">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-primary text-white text-[8px] font-extrabold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link href="/profile" className="flex items-center gap-1.5 text-slate-700 hover:text-primary transition-colors duration-150 font-semibold text-sm">
            <div className="p-2 bg-slate-100 rounded-full">
              <User className="h-4 w-4" />
            </div>
            <span>Profile</span>
          </Link>

          {/* Cart */}
          <Link href="/cart">
            <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm py-2.5 px-4 rounded-button shadow-premium transition-all duration-150">
              <ShoppingCart className="h-4.5 w-4.5" />
              <span>Cart</span>
              {itemsCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {itemsCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
