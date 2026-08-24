"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, ShoppingBasket, ShoppingCart, Tag, Settings } from "lucide-react";

export default function FooterNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders"; // Fallback to orders default

  const navItems = [
    { label: "Dashboard", href: "/?tab=dashboard", tabId: "dashboard", icon: LayoutDashboard },
    { label: "Products", href: "/?tab=products", tabId: "products", icon: ShoppingBasket },
    { label: "Orders", href: "/?tab=orders", tabId: "orders", icon: ShoppingCart },
    { label: "Coupons", href: "/?tab=coupons", tabId: "coupons", icon: Tag },
    { label: "Settings", href: "/settings", tabId: null, icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 py-2 px-4 shadow-lg md:hidden flex justify-between items-center rounded-t-xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        
        // Determine if this nav item is active
        let isActive = false;
        if (item.tabId) {
          isActive = pathname === "/" && activeTab === item.tabId;
        } else {
          isActive = pathname === item.href;
        }

        return (
          <Link key={item.label} href={item.href} className="flex flex-col items-center relative gap-0.5 flex-1 cursor-pointer">
            <div
              className={`p-1 rounded-full transition-all duration-200 ${
                isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span
              className={`text-[9px] font-bold ${
                isActive ? "text-primary font-extrabold" : "text-slate-400"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
