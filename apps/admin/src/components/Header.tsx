"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Settings } from "lucide-react";

export default function Header() {
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || "Malleshwaram, Bengaluru";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm py-3 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand logo & Store Location */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-xl font-extrabold text-primary tracking-tight">
                Veggies
              </span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-950 text-white border border-slate-900">
                Admin
              </span>
            </div>
          </Link>

          {/* Store location hidden on mobile/tablet to save space */}
          <div className="hidden md:flex items-center gap-2 p-1.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="p-1.5 rounded-full bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary leading-none">
                Store Location
              </span>
              <span className="text-xs font-bold text-slate-700 mt-0.5">
                {storeAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Navigation links hidden on mobile since mobile bottom nav is active */}
          <Link href="/" className="text-xs font-extrabold text-slate-500 hover:text-primary transition-colors duration-150 hidden md:inline">
            Dashboard
          </Link>

          {/* Settings */}
          <Link href="/settings" className="flex items-center gap-1.5 text-slate-700 hover:text-primary transition-colors duration-150 font-semibold text-sm hidden md:flex">
            <div className="p-2 bg-slate-100 rounded-full">
              <Settings className="h-4 w-4" />
            </div>
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
