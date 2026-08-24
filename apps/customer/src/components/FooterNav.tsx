"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid, ClipboardList, User, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

export default function FooterNav() {
  const pathname = usePathname();
  const { itemsCount, subtotal } = useCart();
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const supabase = createClient();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Categories", href: "/category", icon: Grid },
    { label: "Orders", href: "/orders", icon: ClipboardList },
    { label: "Profile", href: "/profile", icon: User },
  ];

  useEffect(() => {
    let channel: any;
    async function loadActiveOrder() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query active orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, status")
        .eq("profile_id", user.id)
        .in("status", ["pending", "placed", "confirmed", "preparing", "out_for_delivery"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (ordersData && ordersData.length > 0) {
        setActiveOrder(ordersData[0]);
      }

      // Realtime listener — use unique name to avoid StrictMode reuse conflicts
      channel = supabase
        .channel(`footer-orders-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `profile_id=eq.${user.id}`
          },
          (payload: any) => {
            if (payload.eventType === "DELETE") {
              setActiveOrder(null);
            } else {
              const ord = payload.new;
              if (["pending", "placed", "confirmed", "preparing", "out_for_delivery"].includes(ord.status)) {
                setActiveOrder(ord);
              } else {
                setActiveOrder(null);
              }
            }
          }
        )
        .subscribe();
    }
    loadActiveOrder();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const isExcluded = pathname === "/cart" || pathname === "/checkout";
  const cartOverlayVisible = !isExcluded && itemsCount > 0;
  const activeOrderVisible = !isExcluded && pathname !== "/orders/track" && activeOrder;
  const activeOrderBottom = cartOverlayVisible ? "bottom-[144px]" : "bottom-[84px]";

  return (
    <>
      {/* Floating Active Delivery Overlay */}
      {activeOrderVisible && (
        <Link
          href={`/orders/track?id=${activeOrder.id}`}
          className={`fixed ${activeOrderBottom} left-4 right-4 z-40 bg-gradient-to-r from-emerald-600 to-primary text-white p-3 rounded-xl flex items-center justify-between text-xs shadow-premium cursor-pointer`}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300 animate-pulse" />
            <span className="font-extrabold">Active Delivery: Order #{activeOrder.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <span className="font-black text-yellow-300 capitalize flex items-center gap-0.5">
            {activeOrder.status.replace(/_/g, " ")} <ArrowRight className="h-3 w-3 text-white" />
          </span>
        </Link>
      )}

      {/* Floating Cart Overlay */}
      {cartOverlayVisible && (
        <Link
          href="/cart"
          className="fixed bottom-[84px] left-4 right-4 z-40 bg-primary text-white p-3.5 rounded-xl flex items-center justify-between text-xs font-black shadow-premium hover:bg-primary-dark transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>View Cart ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})</span>
          </div>
          <span className="flex items-center gap-0.5">₹{subtotal} <ArrowRight className="h-3.5 w-3.5" /></span>
        </Link>
      )}

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-slate-100 py-2.5 px-6 shadow-lg sm:hidden flex justify-between items-center rounded-t-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-0.5 flex-1 cursor-pointer">
              <div className="relative">
                <div
                  className={`p-1 rounded-full transition-all duration-205 ${
                    isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon className="h-5.5 w-5.5" />
                </div>
              </div>
              <span
                className={`text-[10px] font-bold ${
                  isActive ? "text-primary font-extrabold" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
