"use client";
import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bike,
  Check,
  IndianRupee,
  Phone,
  ShieldCheck,
} from "lucide-react";
import StoreLocationManager from "@/components/StoreLocationManager";


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
            Manage multiple store branches, GPS delivery origins, and staff terminal passcodes. Sensitive financials remain strictly confidential on this Owner Web Admin.
          </p>
        </div>
      </div>

      {/* SECTION 1: STORES, LOCATIONS, 2KM RADIUS & STAFF TERMINAL CODES */}
      <StoreLocationManager />

      {/* SECTION 2: DELIVERY FLEET & COD CASH RECONCILIATION */}
      <div className="space-y-4 pt-2">
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

    </div>
  );
}

