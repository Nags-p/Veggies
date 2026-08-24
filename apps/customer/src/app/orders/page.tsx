"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, ChevronRight, Bell, Sparkles, MapPin, Zap, Loader2, X, Search } from "lucide-react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import FooterNav from "@/components/FooterNav";
import { useData } from "@/context/DataContext";

interface Order {
  id: string;
  displayId: string;
  date: string;
  items: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  address: string;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  coupon_code: string | null;
  delivery_notes: string | null;
  order_items: any[];
  cancel_reason?: string | null;
}

const mockPastOrders: any[] = [
  {
    id: "ORD-98432",
    date: "14 June 2026, 06:12 PM",
    items: "Royal Gala Apple (x1), Nashik Red Onion (x1), Fresh Spinach (x2)",
    total: 212.00,
    status: "delivered",
    payment_method: "COD",
  },
  {
    id: "ORD-97304",
    date: "08 June 2026, 11:34 AM",
    items: "Organic Hass Avocado (x1), Tri-Color Bell Peppers (x1)",
    total: 315.00,
    status: "delivered",
    payment_method: "online",
  },
];

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";
  const supabase = createClient();

  const { orders: dbOrders, ordersLoading: loadingOrders, setDbOrdersLocal: setDbOrders } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [timelineStep, setTimelineStep] = useState(0); 
  const [searchQuery, setSearchQuery] = useState("");

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  useEffect(() => {
    if (dbOrders && dbOrders.length > 0) {
      const latest = dbOrders[0];
      if (latest && latest.status !== "delivered" && latest.status !== "cancelled") {
        setActiveOrder(latest);
        
        const statusMap: Record<string, number> = {
          pending: 0,
          placed: 0,
          confirmed: 1,
          preparing: 2,
          out_for_delivery: 3,
          delivered: 4
        };
        setTimelineStep(statusMap[latest.status] ?? 0);
      } else {
        setActiveOrder(null);
      }
    }
  }, [dbOrders]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/orders");
      }
    }
    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (showSuccess) {
      triggerNotification("Order Placed!", "Your order is being reviewed by Veggies store.");
    }
  }, [showSuccess]);

  // Request system notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(err => console.error("Permission request failed:", err));
      }
    }

    // Request Capacitor Local Notification permission on Android/iOS
    async function requestCapacitorPermission() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== "granted") {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.error("Failed to request Capacitor notification permissions:", e);
        }
      }
    }
    requestCapacitorPermission();
  }, []);

  // Store dbOrders in a ref to reference in the subscription callback without re-running the effect
  const dbOrdersRef = useRef(dbOrders);
  useEffect(() => {
    dbOrdersRef.current = dbOrders;
  }, [dbOrders]);

  // Listen for realtime updates to order status
  useEffect(() => {
    let active = true;
    let channel: any;
    
    async function subscribeToOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      channel = supabase
        .channel(`order-status-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `profile_id=eq.${user.id}`
          },
          async (payload: any) => {
            const updatedOrder = payload.new;
            
            // Map status string to timeline index (0 to 4)
            const statusMap: Record<string, number> = {
              pending: 0,
              placed: 0,
              confirmed: 1,
              preparing: 2,
              out_for_delivery: 3,
              delivered: 4
            };

            const statusLabels: Record<string, string> = {
              pending: "is pending approval",
              placed: "has been placed",
              confirmed: "has been confirmed by the store",
              preparing: "is being prepared and packed",
              out_for_delivery: "is out for delivery!",
              delivered: "has been delivered successfully!",
              cancelled: "has been cancelled"
            };

            const statusTitle: Record<string, string> = {
              pending: "Order Pending",
              placed: "Order Placed",
              confirmed: "Order Confirmed",
              preparing: "Order Preparing",
              out_for_delivery: "Order Out for Delivery",
              delivered: "Order Delivered 🎉",
              cancelled: "Order Cancelled ✕"
            };

            const title = statusTitle[updatedOrder.status] || "Order Update";
            const message = `Order #${updatedOrder.id.slice(0, 8).toUpperCase()} ${statusLabels[updatedOrder.status] || "status updated"}.`;

            // 1. Trigger in-app notification banner
            triggerNotification(title, message);



            // 4. Update order status in local states
            setDbOrders((prevOrders) =>
              prevOrders.map((o) =>
                o.id === updatedOrder.id
                  ? { ...o, status: updatedOrder.status }
                  : o
              )
            );

            setActiveOrder((prevActive: any) => {
              if (prevActive && prevActive.id === updatedOrder.id) {
                if (updatedOrder.status === "delivered" || updatedOrder.status === "cancelled") {
                  return null;
                }
                const step = statusMap[updatedOrder.status] ?? 0;
                setTimelineStep(step);
                return { ...prevActive, status: updatedOrder.status };
              }
              if (!prevActive && updatedOrder.status !== "delivered" && updatedOrder.status !== "cancelled") {
                const found = dbOrdersRef.current.find(o => o.id === updatedOrder.id);
                if (found) {
                  const step = statusMap[updatedOrder.status] ?? 0;
                  setTimelineStep(step);
                  return { ...found, status: updatedOrder.status };
                }
              }
              return prevActive;
            });
          }
        );

      channel.subscribe();
    }

    subscribeToOrders();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const triggerNotification = (title: string, msg: string) => {
    setNotificationMsg(`${title} - ${msg}`);
    setShowNotification(true);

    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const steps = [
    { label: "Order Placed", desc: "Received at shop" },
    { label: "Confirmed", desc: "Accepted by store" },
    { label: "Preparing", desc: "Sorting & packing" },
    { label: "Out for Delivery", desc: "Rider on the way" },
    { label: "Delivered", desc: "Handed over safely" },
  ];

  if (loadingOrders) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading orders history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Header hideSearch />

      {/* Floating Push Notification Banner (Simulating FCM) */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-premium border border-slate-800 flex items-start gap-3"
          >
            <div className="p-2 bg-primary text-white rounded-full">
              <Bell className="h-5 w-5 animate-swing" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-accent uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Notification
              </span>
              <p className="text-xs font-bold leading-normal">{notificationMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> My Orders
          </h1>
          {/* Search Order Option */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
        </div>

        {/* Active Order Tracking Banner */}
        {activeOrder && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-full animate-pulse">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800">You have an active delivery!</h3>
                <p className="text-[10px] text-slate-550 font-bold mt-0.5">Order #{activeOrder.displayId} is currently {activeOrder.status.replace(/_/g, " ")}.</p>
              </div>
            </div>
            <Link
              href={`/orders/track?id=${activeOrder.id}`}
              className="bg-primary hover:bg-primary-dark text-white font-extrabold text-[10px] py-2 px-4 rounded-xl transition-all shadow-premium"
            >
              Track Order
            </Link>
          </div>
        )}

        {/* Past Orders History */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-800">Order History</h2>
          <div className="space-y-3.5">
            {(() => {
              const list = dbOrders.filter(ord => {
                const q = searchQuery.toLowerCase().trim();
                return !q || ord.displayId.toLowerCase().includes(q) || ord.items.toLowerCase().includes(q);
              });
              if (list.length === 0) {
                return (
                  <div className="bg-card p-8 text-center rounded-xl shadow-card border border-slate-100/80 text-slate-500 text-xs font-bold">
                    No orders matching your search query.
                  </div>
                );
              }
              return list.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className="bg-card p-4 rounded-xl shadow-card border border-slate-100/80 flex items-center justify-between gap-4 hover:border-slate-200 hover:border-primary/20 transition-all duration-150 cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-800">{ord.displayId}</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        ord.status === "delivered" ? "bg-emerald-50 text-emerald-600" :
                        ord.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">{ord.date}</p>
                    <p className="text-xs text-slate-555 font-medium truncate max-w-[350px]">
                      {ord.items}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400">Total Paid</p>
                      <p className="text-sm font-extrabold text-slate-900">₹{ord.total}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </main>

      {/* Order Details Modal Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[85vh] text-slate-800"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850">
                    Order details
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold leading-none mt-1 block">
                    ID: #{selectedOrder.displayId}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
                {/* Status & Date */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ordered On</span>
                    <span className="font-bold text-slate-700 mt-1 block">{selectedOrder.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Status</span>
                    <span className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase mt-1 ${
                      selectedOrder.status === "delivered" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      selectedOrder.status === "cancelled" ? "bg-red-50 text-red-600 border border-red-100" :
                      "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse"
                    }`}>
                      {selectedOrder.status}
                    </span>
                    {selectedOrder.status === "cancelled" && selectedOrder.cancel_reason && (
                      <span className="block text-[10px] font-bold text-red-500 mt-1">
                        Reason: {selectedOrder.cancel_reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Items Ordered
                  </h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                      selectedOrder.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white flex justify-between items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`font-extrabold text-slate-800 truncate text-[11px] ${item.is_cancelled ? "line-through text-slate-400" : ""}`}>
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}
                              {item.products?.weight ? ` (${item.products.weight})` : ""}
                              {item.is_cancelled && (
                                <span className="text-red-500 font-black ml-1.5">
                                  [Cancelled: {item.cancel_reason || "Out of Stock"}]
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`font-black text-[11px] ${item.is_cancelled ? "line-through text-slate-350" : "text-slate-855"}`}>
                            ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-slate-400 text-xs italic">No items listed</p>
                    )}
                  </div>
                </div>

                {/* Bill Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Bill Details
                  </h4>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
                      <span>Items Subtotal</span>
                      <span>₹{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between items-center font-bold text-emerald-600 text-[11px]">
                        <span>Coupon Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ""}</span>
                        <span>-₹{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
                      <span>Delivery Fee</span>
                      <span>₹{selectedOrder.delivery_fee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2.5 flex justify-between items-center font-black text-slate-900 text-sm">
                      <span>Total Paid</span>
                      <span>₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Address & Delivery Notes */}
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Delivery Address
                    </h4>
                    <p className="font-bold text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                      {selectedOrder.address}
                    </p>
                  </div>

                  {selectedOrder.delivery_notes && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        Delivery Notes
                      </h4>
                      <p className="italic text-slate-500 font-semibold bg-amber-50/30 border border-amber-100/50 p-3 rounded-xl">
                        "{selectedOrder.delivery_notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Payment Method</span>
                  <span className="font-bold text-slate-700 mt-1 block uppercase text-[10px]">
                    {selectedOrder.payment_method}
                  </span>
                </div>
              </div>

              {/* Close / Action Buttons */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center gap-3">
                {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" ? (
                  <Link
                    href={`/orders/track?id=${selectedOrder.id}`}
                    className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs py-2.5 px-5 rounded-xl transition-all shadow-premium text-center flex items-center justify-center gap-1.5"
                  >
                    <Clock className="h-4 w-4" /> Track Live Status
                  </Link>
                ) : <div />}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-sm text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FooterNav />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading orders...</p>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
