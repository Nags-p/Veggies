"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, MapPin, Zap, Loader2, ArrowLeft, AlertTriangle, HelpCircle, FileText, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import { createClient } from "@/lib/supabase/client";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_cancelled: boolean;
  cancel_reason: string | null;
  products?: {
    weight: string | null;
  } | null;
}

interface OrderDetails {
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
  cancel_reason: string | null;
  order_items: OrderItem[];
}

function OrderTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const supabase = createClient();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(weight)), addresses(*)")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      if (data) {
        const itemsStr = data.order_items
          ? data.order_items.map((item: any) => {
              const weightStr = item.products?.weight ? ` (${item.products.weight})` : "";
              const cancelStr = item.is_cancelled ? " [Cancelled]" : "";
              return `${item.name}${weightStr}${cancelStr} (x${item.quantity})`;
            }).join(", ")
          : "No items listed";

        setOrder({
          id: data.id,
          displayId: data.id.slice(0, 8).toUpperCase(),
          date: new Date(data.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          }),
          items: itemsStr,
          total: parseFloat(data.net_amount),
          status: data.status,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          address: data.addresses 
            ? `${data.addresses.building_name}, ${data.addresses.complete_address}`
            : "Saved Address",
          discount_amount: parseFloat(data.discount_amount) || 0,
          delivery_fee: parseFloat(data.delivery_fee) || 0,
          total_amount: parseFloat(data.total_amount) || 0,
          coupon_code: data.coupon_code,
          delivery_notes: data.delivery_notes,
          cancel_reason: data.cancel_reason,
          order_items: data.order_items || []
        });
      }
    } catch (err) {
      console.error("Failed to load order tracking details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();

    if (!orderId) return;

    // Listen to changes on orders table
    const orderChannel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    // Listen to changes on order_items table
    const itemsChannel = supabase
      .channel(`order-items-track-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${orderId}`
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!orderId) return;
    const finalReason = cancelReason === "Other" ? customReason : cancelReason;
    if (!finalReason.trim()) {
      alert("Please select or enter a reason for cancellation.");
      return;
    }
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancel_reason: finalReason.trim()
        })
        .eq("id", orderId);

      if (error) throw error;
      setCancelModalOpen(false);
      setCancelReason("");
      setCustomReason("");
      loadOrder();
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading tracking details...</p>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-black text-slate-800">Order Not Found</h2>
        <p className="text-slate-500 text-xs font-bold mt-1">We couldn't retrieve details for this order.</p>
        <Link href="/orders" className="mt-4 bg-primary text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-premium">
          Back to Orders
        </Link>
      </div>
    );
  }

  const steps = [
    { label: "Order Placed", desc: "Received at shop" },
    { label: "Confirmed", desc: "Accepted by store" },
    { label: "Preparing", desc: "Sorting & packing" },
    { label: "Out for Delivery", desc: "Rider on the way" },
    { label: "Delivered", desc: "Handed over safely" },
  ];

  const statusMap: Record<string, number> = {
    pending: 0,
    placed: 0,
    confirmed: 1,
    preparing: 2,
    out_for_delivery: 3,
    delivered: 4
  };

  const timelineStep = statusMap[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";
  
  // Can cancel if status is pending, confirmed, or preparing (i.e. before out for delivery)
  const isCancellable = ["pending", "placed", "confirmed", "preparing"].includes(order.status);

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 py-3.5 px-4 md:px-8 flex justify-between items-center shadow-sm">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs md:text-sm font-black text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
          isCancelled ? "bg-red-50 text-red-600 border border-red-100" :
          order.status === "delivered" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
          "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse"
        }`}>
          {order.status === "pending" || order.status === "placed" ? "Waiting Approval" : order.status.replace(/_/g, " ")}
        </span>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* Live Timeline Card */}
        <div className="bg-card p-6 rounded-2xl shadow-premium border border-accent/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full mb-1.5 inline-block">
                Live Delivery Tracking
              </span>
              <h2 className="text-base font-black text-slate-800">
                Order #{order.displayId}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Payable</p>
              <p className="text-xl font-black text-slate-900">₹{order.total}</p>
              <p className="text-[9px] font-bold text-emerald-600 capitalize mt-0.5">{order.payment_method} • {order.payment_status}</p>
            </div>
          </div>

          {isCancelled ? (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-xs text-red-800">Order Cancelled</p>
                <p className="text-[11px] text-red-700 font-bold mt-0.5">
                  Reason: {order.cancel_reason || "All items cancelled or unavailable."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Delivery Progress
              </h3>

              {/* Vertical on mobile, horizontal on desktop */}
              <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-4 pt-2">
                {steps.map((step, idx) => {
                  const isCompleted = idx < timelineStep;
                  const isActive = idx === timelineStep;

                  return (
                    <div key={idx} className="flex md:flex-col items-center gap-4 md:gap-2 flex-1 relative">
                      {/* Connecting Line */}
                      {idx < steps.length - 1 && (
                        <div
                          className={`hidden md:block absolute top-[16px] left-[55%] right-[-45%] h-0.5 z-0 ${
                            isCompleted ? "bg-primary" : "bg-slate-100"
                          }`}
                        />
                      )}

                      {/* Icon Node */}
                      <div className="z-10 flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-8 w-8 text-primary fill-primary-light/10" />
                        ) : isActive ? (
                          <div className="relative h-8 w-8 rounded-full border-2 border-primary bg-white flex items-center justify-center shadow-premium border-primary/20 animate-pulse">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-slate-200" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="text-left md:text-center space-y-0.5">
                        <p className={`text-xs font-extrabold leading-snug ${isCompleted || isActive ? "text-slate-800" : "text-slate-400"}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 leading-normal">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Address Card */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-slate-800">Delivery Address</h4>
                <p className="text-[10px] text-slate-550 font-semibold max-w-[400px] leading-relaxed block mt-0.5 break-words whitespace-normal">
                  {order.address}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery notes if any */}
          {order.delivery_notes && (
            <div className="bg-amber-50/20 border border-amber-100/50 p-3.5 rounded-xl text-[11px] font-bold text-slate-650 flex items-start gap-2">
              <FileText className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="italic font-medium">"{order.delivery_notes}"</p>
            </div>
          )}
        </div>

        {/* Ordered Items Summary */}
        <div className="bg-card p-6 rounded-2xl shadow-premium border border-accent/10 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-primary" /> Items in this Order
          </h3>

          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
            {order.order_items && order.order_items.length > 0 ? (
              order.order_items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-extrabold text-slate-800 truncate text-[11px] ${item.is_cancelled ? "line-through text-slate-400" : ""}`}>
                      {item.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {item.quantity} x ₹{parseFloat(item.price as any).toFixed(2)}
                      {item.products?.weight ? ` (${item.products.weight})` : ""}
                      {item.is_cancelled && (
                        <span className="text-red-500 font-black ml-1.5">
                          [Cancelled: {item.cancel_reason || "Out of Stock"}]
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`font-black text-[11px] flex-shrink-0 ${item.is_cancelled ? "line-through text-slate-350" : "text-slate-855"}`}>
                    ₹{(item.quantity * parseFloat(item.price as any)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-3 text-slate-455 text-xs italic text-center">No items listed</p>
            )}
          </div>

          {/* Pricing Details */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5">
            <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
              <span>Items Subtotal</span>
              <span>₹{order.total_amount.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between items-center font-bold text-emerald-600 text-[11px]">
                <span>Coupon Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                <span>-₹{order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
              <span>Delivery Fee</span>
              <span>₹{order.delivery_fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200/60 pt-2.5 flex justify-between items-center font-black text-slate-900 text-sm">
              <span>Total Amount Paid</span>
              <span className="text-primary text-base">₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Section for Customer */}
        {isCancellable && (
          <div className="bg-red-50/30 border border-red-100/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-extrabold text-red-800 text-xs flex items-center gap-1 justify-center md:justify-start">
                <HelpCircle className="h-4 w-4" /> Need to cancel this order?
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                You can cancel your order at any time before it goes Out for Delivery.
              </p>
            </div>
            <button
              onClick={() => setCancelModalOpen(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-xs py-2.5 px-6 rounded-xl cursor-pointer transition-all hover:shadow-sm"
            >
              Cancel Order
            </button>
          </div>
        )}
      </main>

      {/* Customer Cancellation Reason Dialog */}
      <AnimatePresence>
        {cancelModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-sm p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-105 p-5 space-y-4 text-slate-800 text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-red-500" /> Cancel Order #{order.displayId}
                </h3>
                <button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setCancelReason("");
                    setCustomReason("");
                  }}
                  className="text-slate-400 hover:text-slate-650 font-extrabold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                  Select Reason for Cancellation
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Ordered by mistake / wrong items",
                    "Delivery time is too long",
                    "Forgot to apply coupon code",
                    "Change in plans / no longer needed",
                    "Other"
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setCancelReason(reason)}
                      className={`text-left p-3 rounded-xl border text-[11px] font-bold transition-all duration-150 ${
                        cancelReason === reason
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                {cancelReason === "Other" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                      Please specify your reason
                    </label>
                    <input
                      type="text"
                      placeholder="Type custom reason here..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setCancelReason("");
                    setCustomReason("");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-755 font-extrabold text-xs py-2 px-4.5 rounded-xl cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" /> Cancelling...
                    </>
                  ) : (
                    "Confirm Cancel"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading tracking page...</p>
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  );
}
