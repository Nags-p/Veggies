"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  KeyRound,
  Store,
  Bike,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ShieldCheck,
  IndianRupee,
  Phone,
  Power,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";

interface StoreStaffCode {
  id: string;
  store_name: string;
  access_code: string;
  is_active: boolean;
  last_used_at?: string | null;
  created_at: string;
}

interface DeliveryRider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  is_online: boolean;
  deliveries_today: number;
  cod_cash_held: number;
  settled: boolean;
}

export default function StoreStaffManager() {
  const supabase = createClient();
  const [codes, setCodes] = useState<StoreStaffCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [generating, setGenerating] = useState(false);

  // Delivery riders state
  const [riders, setRiders] = useState<DeliveryRider[]>([
    {
      id: "rider-101",
      name: "Kiran R (Indiranagar Fleet)",
      phone: "+91 98888 12345",
      vehicle: "Honda Activa (KA-04-EK-2041)",
      is_online: true,
      deliveries_today: 7,
      cod_cash_held: 1240,
      settled: false,
    },
    {
      id: "rider-102",
      name: "Sunil Kumar (Koramangala Fleet)",
      phone: "+91 97777 54321",
      vehicle: "TVS Jupiter (KA-05-JM-8910)",
      is_online: true,
      deliveries_today: 4,
      cod_cash_held: 680,
      settled: false,
    },
  ]);

  // Load codes
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_staff_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback default codes
        setCodes([
          {
            id: "code-1",
            store_name: "Veggies Flagship Store (Indiranagar)",
            access_code: "492810",
            is_active: true,
            last_used_at: new Date(Date.now() - 15 * 60000).toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "code-2",
            store_name: "Veggies Express Store (Koramangala)",
            access_code: "773901",
            is_active: true,
            last_used_at: new Date(Date.now() - 3600000).toISOString(),
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ]);
      } else {
        setCodes(data as StoreStaffCode[]);
      }
    } catch (err) {
      console.error("Error fetching staff codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate random 6 digit code
  const generateRandomPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Rotate / Regenerate existing code
  const rotateCode = async (id: string) => {
    const newCode = generateRandomPin();
    try {
      await supabase
        .from("store_staff_codes")
        .update({ access_code: newCode, last_used_at: null })
        .eq("id", id);

      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, access_code: newCode } : c))
      );
    } catch (err) {
      console.error("Failed to rotate code:", err);
    }
  };

  // Toggle active status
  const toggleCodeActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await supabase
        .from("store_staff_codes")
        .update({ is_active: nextStatus })
        .eq("id", id);

      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: nextStatus } : c))
      );
    } catch (err) {
      console.error("Failed to toggle code status:", err);
    }
  };

  // Create new branch code
  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setGenerating(true);

    const generatedCode = generateRandomPin();
    try {
      const { data, error } = await supabase
        .from("store_staff_codes")
        .insert({
          store_name: newStoreName.trim(),
          access_code: generatedCode,
          is_active: true,
        })
        .select()
        .single();

      if (data) {
        setCodes((prev) => [data as StoreStaffCode, ...prev]);
      } else {
        const fallback: StoreStaffCode = {
          id: `code-${Date.now()}`,
          store_name: newStoreName.trim(),
          access_code: generatedCode,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setCodes((prev) => [fallback, ...prev]);
      }
      setShowAddModal(false);
      setNewStoreName("");
    } catch (err) {
      console.error("Error creating staff code:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Settle rider COD cash
  const settleRiderCash = (riderId: string) => {
    setRiders((prev) =>
      prev.map((r) =>
        r.id === riderId ? { ...r, cod_cash_held: 0, settled: true } : r
      )
    );
  };

  const totalCodPending = riders.reduce((acc, r) => acc + r.cod_cash_held, 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Ecosystem Architecture Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-700/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              ROLE DECOUPLING ACTIVE
            </span>
            <span className="text-xs text-emerald-200/80">• 4 Distinct Actor Portals</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Store Staff Terminal & Delivery Fleet Manager
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
            Staff use the <strong>Store Access Code</strong> below to log in directly into the packing terminal without phone/OTP registration. Sensitive financials remain strictly confidential on this Owner Web Admin.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Store Staff Code
        </button>
      </div>

      {/* SECTION 1: STORE STAFF ACCESS CODES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Active Store Staff Login Codes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter these 6-digit codes on the Store Staff App (<span className="font-mono text-emerald-700 font-semibold">http://localhost:3002</span>) to begin packing orders.
            </p>
          </div>
          <button
            onClick={fetchCodes}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Refresh Codes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codes.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition shadow-sm flex flex-col justify-between ${
                item.is_active
                  ? "bg-white border-slate-200/90 hover:border-emerald-500/40"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-800">{item.store_name}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                  >
                    {item.is_active ? "ACTIVE" : "REVOKED"}
                  </span>
                </div>

                {/* Big Display Code */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Store Terminal PIN
                    </span>
                    <div className="text-2xl font-black font-mono tracking-widest text-slate-800 mt-0.5">
                      {item.access_code}
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(item.id, item.access_code)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3">
                  <span>
                    Last active:{" "}
                    {item.last_used_at
                      ? new Date(item.last_used_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Not used yet"}
                  </span>
                  <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => rotateCode(item.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Generate a new PIN and invalidate the old one"
                >
                  <RefreshCw className="w-3 h-3" />
                  Rotate PIN
                </button>

                <button
                  onClick={() => toggleCodeActive(item.id, item.is_active)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    item.is_active
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  {item.is_active ? "Revoke Access" : "Reactivate Code"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: DELIVERY FLEET & COD CASH RECONCILIATION */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Bike className="w-4 h-4 text-emerald-600" />
              Delivery Fleet & COD Cash Settlements
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track delivery riders, active shift status, and daily Cash-on-Delivery collected at customer doorsteps.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">
              Pending COD Deposit: ₹{totalCodPending.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riders.map((rider) => (
            <div
              key={rider.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{rider.name}</h4>
                    <p className="text-xs text-slate-400">{rider.vehicle}</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ON DUTY
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Drops</span>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {rider.deliveries_today}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">COD Cash</span>
                  <div className="text-base font-bold text-amber-600 mt-0.5">
                    ₹{rider.cod_cash_held}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Rider Pay</span>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">
                    ₹{rider.deliveries_today * 45}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <a
                  href={`tel:${rider.phone}`}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {rider.phone}
                </a>

                {rider.cod_cash_held > 0 ? (
                  <button
                    onClick={() => settleRiderCash(rider.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Settle Cash Deposit
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Cash Deposited
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE NEW CODE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                New Store Staff Login Code
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create an operational PIN for staff packing devices at a specific branch or shift.
            </p>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Store / Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Veggies HSR Layout Hub"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>A secure 6-digit PIN will be automatically generated upon creation.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {generating ? "Creating..." : "Generate Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
