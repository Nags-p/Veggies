"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || "Malleshwaram, Bengaluru";
  const supabase = createClient();
  const [storeOpenStatus, setStoreOpenStatus] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "store_status")
          .single();
        if (data) {
          setStoreOpenStatus(data.value.is_open);
        }
      } catch (err) {
        console.error("Failed to load store status in header:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();

    // Subscribe to realtime changes in store settings so it syncs across all pages instantly
    const channel = supabase
      .channel("store-status-header-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "store_settings", filter: "key=eq.store_status" },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            setStoreOpenStatus(payload.new.value.is_open);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleToggle = async () => {
    const nextStatus = !storeOpenStatus;
    setStoreOpenStatus(nextStatus); // Optimistic UI
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({ value: { is_open: nextStatus } })
        .eq("key", "store_status");
      if (error) throw error;
    } catch (err) {
      console.error("Failed to toggle store status:", err);
      setStoreOpenStatus(!nextStatus); // Revert
    }
  };

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
          {/* Store Switcher Toggle Switch using standard Tailwind sizes to render correctly */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-sm select-none">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider hidden sm:inline">
              Store Status:
            </span>
            <button
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                storeOpenStatus ? "bg-primary" : "bg-red-500"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  storeOpenStatus ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-[10px] font-black tracking-wider ${storeOpenStatus ? "text-primary" : "text-red-500"}`}>
              {storeOpenStatus ? "OPEN" : "CLOSED"}
            </span>
          </div>

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
