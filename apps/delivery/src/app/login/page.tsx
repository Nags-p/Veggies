"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, ShieldCheck, ArrowRight, Phone, Lock, AlertCircle } from "lucide-react";

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone) {
      setError("Please enter your registered rider mobile number");
      return;
    }
    if (!cleanPin) {
      setError("Please enter your 4-digit rider security PIN");
      return;
    }

    setLoading(true);

    try {
      // In production, authenticates via Supabase Auth / profiles where role = 'delivery'
      const riderSession = {
        rider_id: "rider-101",
        rider_name: "Kiran R (Rider)",
        phone: cleanPhone,
        vehicle: "Honda Activa (KA-04-EK-2041)",
        online: true,
        login_time: new Date().toISOString(),
      };

      localStorage.setItem("veggies_delivery_session", JSON.stringify(riderSession));
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Failed to log in as delivery partner");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoSession = {
      rider_id: "rider-101",
      rider_name: "Kiran R (Rider)",
      phone: "+91 98888 12345",
      vehicle: "Honda Activa (KA-04-EK-2041)",
      online: true,
      login_time: new Date().toISOString(),
    };
    localStorage.setItem("veggies_delivery_session", JSON.stringify(demoSession));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-4">
            <Bike className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Veggies Delivery Partner
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rider Fleet Navigation & Earnings
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Rider Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98888 12345"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              4-Digit PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white font-mono tracking-widest text-lg outline-none transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
          >
            {loading ? "Starting Shift..." : "Go on Duty"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 font-semibold rounded-xl text-xs border border-emerald-500/20 transition flex items-center justify-center gap-1.5"
          >
            <Bike className="w-4 h-4" />
            Quick Demo Driver Login (Kiran R)
          </button>
          <p className="text-[11px] text-center text-slate-500">
            For onboarding new delivery partners, contact the store manager.
          </p>
        </div>
      </div>
    </div>
  );
}
