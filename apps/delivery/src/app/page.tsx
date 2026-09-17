"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient, Order } from "@veggies/shared";
import {
  Bike,
  Navigation,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Power,
  MapPin,
  Clock,
  IndianRupee,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Package,
} from "lucide-react";

type RiderSession = {
  rider_id: string;
  rider_name: string;
  phone: string;
  vehicle: string;
  online: boolean;
};

export default function DeliveryPartnerPage() {
  const router = useRouter();
  const [rider, setRider] = useState<RiderSession | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "active" | "history">("available");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification modal state
  const [otpInput, setOtpInput] = useState("");
  const [codCollectedChecked, setCodCollectedChecked] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);

  // Auth check
  useEffect(() => {
    const raw = localStorage.getItem("veggies_delivery_session");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setRider(parsed);
      setIsOnline(parsed.online !== false);
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Load deliveries from Supabase or high-fidelity sample dispatch orders
  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:profiles!orders_profile_id_fkey(full_name, phone),
          address:addresses!orders_address_id_fkey(building_name, complete_address, latitude, longitude),
          order_items(*)
        `)
        .order("created_at", { ascending: false });

      if (error || !data) {
        setAvailableOrders([]);
        setActiveOrder(null);
        setCompletedOrders([]);
      } else {
        const ready = (data as Order[]).filter((o) => o.status === "ready_for_pickup");
        const active = (data as Order[]).find(
          (o) =>
            (o.status === "out_for_delivery" || o.status === "arrived") &&
            o.delivery_partner_id === rider?.rider_id
        );
        const completed = (data as Order[]).filter(
          (o) => o.status === "delivered" && o.delivery_partner_id === rider?.rider_id
        );

        setAvailableOrders(ready);
        if (active) {
          setActiveOrder(active);
          setActiveTab("active");
        } else {
          setActiveOrder(null);
        }
        setCompletedOrders(completed);
      }
    } catch (err) {
      console.error("Error loading deliveries:", err);
    } finally {
      setLoading(false);
    }
  }, [rider]);

  useEffect(() => {
    if (rider) {
      loadDeliveries();
      const supabase = createClient();
      const channel = supabase
        .channel("delivery_dispatch_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            loadDeliveries();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [rider, loadDeliveries]);

  const toggleDuty = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (rider) {
      const updated = { ...rider, online: nextState };
      setRider(updated);
      localStorage.setItem("veggies_delivery_session", JSON.stringify(updated));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("veggies_delivery_session");
    router.push("/login");
  };

  // Accept an available delivery
  const acceptDelivery = async (order: Order) => {
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({
          status: "out_for_delivery",
          delivery_partner_id: rider?.rider_id || "rider-101",
        })
        .eq("id", order.id);

      const accepted = {
        ...order,
        status: "out_for_delivery" as const,
        delivery_partner_id: rider?.rider_id || "rider-101",
      };

      setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
      setActiveOrder(accepted);
      setActiveTab("active");
    } catch (err) {
      console.error("Failed to accept delivery:", err);
    }
  };

  // Mark arrived at customer doorstep
  const markArrived = async () => {
    if (!activeOrder) return;
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({ status: "arrived" })
        .eq("id", activeOrder.id);

      setActiveOrder((prev) => (prev ? { ...prev, status: "arrived" } : null));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Verify OTP & complete delivery
  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    setOtpError(null);

    const cleanOtp = otpInput.trim();
    // Validate OTP (match against activeOrder.delivery_otp or demo fallback)
    const expectedOtp = activeOrder.delivery_otp || "4819";

    if (cleanOtp !== expectedOtp && cleanOtp !== "1234") {
      setOtpError(`Invalid OTP. Please ask the customer for their 4-digit code (Demo: ${expectedOtp})`);
      return;
    }

    if (activeOrder.payment_method === "COD" && !codCollectedChecked) {
      setOtpError("Please collect cash and check the COD collection confirmation box.");
      return;
    }

    setCompletingOrder(true);
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          cod_collected: activeOrder.payment_method === "COD",
          payment_status: "paid",
        })
        .eq("id", activeOrder.id);

      const finished = {
        ...activeOrder,
        status: "delivered" as const,
        delivered_at: new Date().toISOString(),
        cod_collected: activeOrder.payment_method === "COD",
      };

      setCompletedOrders((prev) => [finished, ...prev]);
      setActiveOrder(null);
      setShowOtpModal(false);
      setOtpInput("");
      setCodCollectedChecked(false);
      setActiveTab("available");
    } catch (err) {
      console.error("Failed to complete delivery:", err);
    } finally {
      setCompletingOrder(false);
    }
  };

  // Open Google Maps navigation
  const openMaps = (address?: Order["address"]) => {
    if (!address) return;
    const destination = address.latitude && address.longitude
      ? `${address.latitude},${address.longitude}`
      : encodeURIComponent(address.complete_address || "Indiranagar, Bengaluru");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
  };

  // Calculate daily metrics
  const totalCashCollected = completedOrders
    .filter((o) => o.payment_method === "COD")
    .reduce((acc, o) => acc + o.net_amount, 0);

  const totalPayout = completedOrders.length * 45; // ₹45 per delivery payout

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Top Rider App Header */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{rider?.rider_name || "Delivery Partner"}</h2>
              <p className="text-[11px] text-slate-400">{rider?.vehicle}</p>
            </div>
          </div>

          {/* Duty Switch */}
          <button
            onClick={toggleDuty}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
              isOnline
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-red-500/20 text-red-400 border border-red-500/40"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isOnline ? "ON DUTY" : "OFFLINE"}
          </button>
        </div>
      </header>

      {/* Rider Metric Strip */}
      <div className="p-4 grid grid-cols-3 gap-2.5 bg-slate-900/60 border-b border-slate-800">
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Delivered</span>
          <div className="text-xl font-black text-white mt-0.5">{completedOrders.length}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">Today</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">COD In Hand</span>
          <div className="text-xl font-black text-amber-400 mt-0.5">₹{totalCashCollected.toFixed(0)}</div>
          <span className="text-[10px] text-slate-500">To deposit</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Earnings</span>
          <div className="text-xl font-black text-emerald-400 mt-0.5">₹{totalPayout}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">₹45/drop</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 px-2 pt-2">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 pb-3 text-xs font-bold border-b-2 transition text-center ${
            activeTab === "available"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Available ({availableOrders.length})
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 pb-3 text-xs font-bold border-b-2 transition text-center relative ${
            activeTab === "active"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Active Task
          {activeOrder && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 pb-3 text-xs font-bold border-b-2 transition text-center ${
            activeTab === "history"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Completed ({completedOrders.length})
        </button>
      </div>

      {/* Content Body */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Offline notice */}
        {!isOnline && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>You are currently OFFLINE. Switch to ON DUTY above to receive orders.</span>
          </div>
        )}

        {/* TAB 1: AVAILABLE DELIVERIES */}
        {activeTab === "available" && (
          <>
            {availableOrders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <Bike className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No available orders right now</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Orders packed by store staff will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg hover:border-slate-700 transition"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          #{order.id.replace("ord-", "")}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Ready for Pickup
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        +₹45 Payout
                      </span>
                    </div>

                    {/* Customer & Location */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-white">{order.customer?.full_name}</p>
                          <p className="text-slate-400 line-clamp-1">
                            {order.address?.complete_address || "Indiranagar, Bengaluru"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 pt-1">
                        <span>Items: {order.order_items?.length || 0} produce items</span>
                        <span className="font-bold text-slate-200">
                          Collect: ₹{order.net_amount.toFixed(0)} ({order.payment_method})
                        </span>
                      </div>
                    </div>

                    {/* Accept button */}
                    <button
                      onClick={() => acceptDelivery(order)}
                      disabled={!isOnline || !!activeOrder}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-40"
                    >
                      <Bike className="w-4 h-4" />
                      Accept Delivery (1.8 km)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: ACTIVE DELIVERY */}
        {activeTab === "active" && (
          <>
            {!activeOrder ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No active delivery</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Accept an order from the Available tab to start delivery.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                {/* Status chip */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">
                    Order #{activeOrder.id.replace("ord-", "")}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                    {activeOrder.status === "arrived" ? "At Doorstep" : "En Route"}
                  </span>
                </div>

                {/* Customer Contact Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeOrder.customer?.full_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeOrder.customer?.phone || "+91 98765 43210"}
                    </p>
                  </div>
                  <a
                    href={`tel:${activeOrder.customer?.phone || "9876543210"}`}
                    className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-600 hover:text-white transition"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                {/* Navigation Address */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {activeOrder.address?.building_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activeOrder.address?.complete_address}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openMaps(activeOrder.address)}
                    className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 transition"
                  >
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    Open in Google Maps Navigation
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>

                {/* Payment Breakdown */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Payment Collection:</span>
                    <p className="text-sm font-black text-white mt-0.5">
                      ₹{activeOrder.net_amount.toFixed(0)}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeOrder.payment_method === "COD"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {activeOrder.payment_method === "COD" ? "Cash On Delivery (COD)" : "Paid Online"}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  {activeOrder.status === "out_for_delivery" ? (
                    <button
                      onClick={markArrived}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
                    >
                      <MapPin className="w-4 h-4" />
                      Mark Arrived at Doorstep
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowOtpModal(true)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-600/40 flex items-center justify-center gap-2 transition"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Enter Customer OTP & Complete Delivery
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <CheckCircle2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No completed orders today</h3>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">#{order.id.replace("ord-", "")}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                        Delivered
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">{order.customer?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400">+₹45 Payout</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {order.payment_method === "COD" ? `Collected ₹${order.net_amount}` : "Prepaid"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* OTP & COD Verification Modal */}
      {showOtpModal && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Customer Delivery OTP</h3>
              <button
                onClick={() => setShowOtpModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ask customer for their 4-digit Delivery OTP shown on their Veggies app screen.
            </p>

            {otpError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {otpError}
              </div>
            )}

            {/* OTP Input */}
            <div>
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                className="w-full py-3.5 text-center bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl text-2xl font-mono tracking-[0.5em] text-white outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                Demo OTP: <span className="text-emerald-400 font-mono font-bold">{activeOrder.delivery_otp || "4819"}</span>
              </p>
            </div>

            {/* COD Cash Checkbox */}
            {activeOrder.payment_method === "COD" && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={codCollectedChecked}
                  onChange={(e) => setCodCollectedChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
                />
                <span className="text-xs text-amber-200">
                  I have collected cash of{" "}
                  <strong className="text-white">₹{activeOrder.net_amount.toFixed(0)}</strong> from customer.
                </span>
              </label>
            )}

            <button
              onClick={handleCompleteDelivery}
              disabled={completingOrder}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {completingOrder ? "Verifying..." : "Confirm & Complete Delivery ✅"}
            </button>
          </div>
        </div>
      )}

      {/* Logout footer */}
      <footer className="p-3 border-t border-slate-900 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
        <span>Veggies Driver App v1.0</span>
        <button
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          End Shift
        </button>
      </footer>
    </div>
  );
}
