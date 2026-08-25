"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

export default function CouponsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { subtotal } = useCart();

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadCoupons() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;
        if (data) {
          setCoupons(data);
        }
      } catch (err: any) {
        console.error("Failed to load coupons:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCoupons();
  }, [supabase]);

  const handleApplyCoupon = (code: string) => {
    router.push(`/cart?coupon=${code.toUpperCase()}`);
  };

  const handleManualApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const matched = coupons.find(
      (c) => c.code.toUpperCase() === manualCode.trim().toUpperCase()
    );

    if (!matched) {
      setErrorMsg("Invalid coupon code. Please try another one.");
      return;
    }

    if (subtotal < matched.min_order_value) {
      setErrorMsg(
        `This coupon requires a minimum purchase of ₹${matched.min_order_value}. Add ₹${
          matched.min_order_value - subtotal
        } more to apply.`
      );
      return;
    }

    setErrorMsg("");
    handleApplyCoupon(matched.code);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-650"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-left">
            <h1 className="text-sm font-black text-slate-800">Apply Coupon</h1>
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
              Cart Value: ₹{subtotal}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Manual Coupon Input Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
          <h2 className="text-xs font-black text-slate-800 mb-3 text-left">
            Enter Promo Code
          </h2>
          <form onSubmit={handleManualApply} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="e.g. WELCOME50"
                className="w-full bg-slate-50 border border-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="bg-primary hover:bg-primary-dark text-white font-extrabold px-5 py-3 rounded-xl shadow-premium text-xs transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </form>

          {errorMsg && (
            <div className="flex items-start gap-1.5 mt-3 text-red-500 text-[10px] font-bold text-left bg-red-50/50 p-2.5 rounded-lg border border-red-100/50">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Coupons List Section */}
        <div className="space-y-3 text-left">
          <h3 className="text-xs font-black text-slate-800 px-1">
            Available Offers
          </h3>

          {loading ? (
            // Shimmer Loading Skeleton
            <div className="space-y-3.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-slate-200 rounded w-24" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-card text-center space-y-2">
              <Tag className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-400">
                No active coupons found at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {coupons
                .sort((a, b) => {
                  const aEligible = subtotal >= a.min_order_value ? 0 : 1;
                  const bEligible = subtotal >= b.min_order_value ? 0 : 1;
                  return aEligible - bEligible;
                })
                .map((c) => {
                  const isEligible = subtotal >= c.min_order_value;
                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-2xl border p-5 shadow-card transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                        isEligible
                          ? "border-slate-100 hover:border-primary/30"
                          : "border-slate-100 opacity-80"
                      }`}
                    >
                      {/* Top Row: Coupon Code & Action */}
                      <div className="flex justify-between items-center gap-3">
                        <div className="bg-emerald-50 border border-emerald-100 text-primary px-3 py-1.5 rounded-xl font-black text-xs tracking-wider uppercase w-fit">
                          {c.code}
                        </div>
                        <button
                          disabled={!isEligible}
                          onClick={() => handleApplyCoupon(c.code)}
                          className={`text-xs font-extrabold px-5 py-2 rounded-xl border transition-all cursor-pointer ${
                            isEligible
                              ? "bg-primary border-primary text-white hover:bg-primary-dark shadow-sm hover:scale-105 active:scale-95"
                              : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          Apply
                        </button>
                      </div>

                      {/* Info Description */}
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 block">
                          {c.discount_type === "flat"
                            ? `Save Flat ₹${c.discount_value}`
                            : `Save ${c.discount_value}% Off`} on orders above ₹{c.min_order_value}
                        </span>

                        {!isEligible && (
                          <div className="flex items-center gap-1.5 mt-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/40 w-fit">
                            <span className="text-[9px] font-extrabold text-amber-600">
                              Add ₹{c.min_order_value - subtotal} more to unlock this coupon
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
