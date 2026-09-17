"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient, Order, OrderItem, StaffSession } from "@veggies/shared";
import {
  PackageCheck,
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  Search,
  Check,
  Bike,
  Sparkles,
  Layers,
} from "lucide-react";

export default function StaffTerminalPage() {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"to_pack" | "ready" | "dispatched">("to_pack");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemChecklist, setItemChecklist] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Play audio chime for new incoming orders
  const playAlertSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio chime not allowed yet:", e);
    }
  }, [soundEnabled]);

  // Auth check
  useEffect(() => {
    const rawSession = localStorage.getItem("veggies_staff_session");
    if (!rawSession) {
      router.push("/login");
      return;
    }
    try {
      setSession(JSON.parse(rawSession));
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Fetch orders from Supabase or load rich mock operational orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:profiles!orders_profile_id_fkey(full_name, phone),
          address:addresses!orders_address_id_fkey(building_name, complete_address),
          order_items(*)
        `)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback sample data for store staff operational testing
        const sampleOrders: Order[] = [
          {
            id: "ord-1042",
            profile_id: "demo-cust-1",
            status: "preparing",
            total_amount: 486.0,
            discount_amount: 50.0,
            delivery_fee: 20.0,
            net_amount: 456.0,
            payment_method: "COD",
            payment_status: "pending",
            delivery_notes: "Leave with security guard if not answering",
            estimated_delivery_time: "15 mins",
            packer_name: session?.staff_name || "Ramesh (Picker)",
            delivery_otp: "4819",
            created_at: new Date(Date.now() - 5 * 60000).toISOString(),
            customer: {
              id: "demo-cust-1",
              full_name: "Priya Sharma",
              phone: "+91 98765 43210",
              role: "customer",
            },
            address: {
              name: "Home",
              building_name: "Apartment 402, Green Glen",
              complete_address: "12th Cross, Indiranagar, Bengaluru",
              latitude: 12.9716,
              longitude: 77.5946,
            },
            order_items: [
              {
                id: "item-1",
                order_id: "ord-1042",
                name: "Fresh Spinach (Palak) - 250g bunch",
                price: 22.0,
                quantity: 2,
                image_url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=200",
              },
              {
                id: "item-2",
                order_id: "ord-1042",
                name: "Premium Potato (Jyoti) - 1 kg",
                price: 38.0,
                quantity: 2,
                image_url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=200",
              },
              {
                id: "item-3",
                order_id: "ord-1042",
                name: "Tri-Color Bell Peppers - 3 pcs",
                price: 125.0,
                quantity: 1,
                image_url: "https://images.unsplash.com/photo-1566393028639-d108a42c46a7?q=80&w=200",
              },
              {
                id: "item-4",
                order_id: "ord-1042",
                name: "Fresh Coriander (Dhaniya) - 100g",
                price: 12.0,
                quantity: 1,
                image_url: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=200",
              },
            ],
          },
          {
            id: "ord-1043",
            profile_id: "demo-cust-2",
            status: "pending",
            total_amount: 320.0,
            discount_amount: 0.0,
            delivery_fee: 20.0,
            net_amount: 340.0,
            payment_method: "online",
            payment_status: "paid",
            delivery_notes: "Ring bell twice",
            estimated_delivery_time: "10 mins",
            delivery_otp: "7721",
            created_at: new Date(Date.now() - 1 * 60000).toISOString(),
            customer: {
              id: "demo-cust-2",
              full_name: "Amit Deshmukh",
              phone: "+91 91234 56789",
              role: "customer",
            },
            address: {
              name: "Flat 101",
              building_name: "Sylvan Heights",
              complete_address: "5th Block, Koramangala, Bengaluru",
              latitude: 12.9352,
              longitude: 77.6245,
            },
            order_items: [
              {
                id: "item-5",
                order_id: "ord-1043",
                name: "Organic Hass Avocado - 1 pc",
                price: 190.0,
                quantity: 1,
                image_url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=200",
              },
              {
                id: "item-6",
                order_id: "ord-1043",
                name: "Fresh Strawberry Box - 200g",
                price: 95.0,
                quantity: 1,
                image_url: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=200",
              },
            ],
          },
          {
            id: "ord-1040",
            profile_id: "demo-cust-3",
            status: "ready_for_pickup",
            total_amount: 510.0,
            discount_amount: 20.0,
            delivery_fee: 20.0,
            net_amount: 510.0,
            payment_method: "COD",
            payment_status: "pending",
            packer_name: session?.staff_name || "Ramesh (Picker)",
            delivery_otp: "9102",
            packed_at: new Date(Date.now() - 12 * 60000).toISOString(),
            created_at: new Date(Date.now() - 25 * 60000).toISOString(),
            customer: {
              id: "demo-cust-3",
              full_name: "Neha Patel",
              phone: "+91 99887 76655",
              role: "customer",
            },
            address: {
              name: "Villa 12",
              building_name: "Palm Meadows",
              complete_address: "Whitefield, Bengaluru",
              latitude: 12.9698,
              longitude: 77.7499,
            },
            order_items: [
              {
                id: "item-7",
                order_id: "ord-1040",
                name: "Broccoli Florets - 1 pc (300g)",
                price: 85.0,
                quantity: 2,
                image_url: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ecf?q=80&w=200",
              },
            ],
          },
        ];
        setOrders(sampleOrders);
      } else {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchOrders();
      // Setup Realtime subscription
      const supabase = createClient();
      const channel = supabase
        .channel("staff_order_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              playAlertSound();
            }
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchOrders, playAlertSound]);

  const handleLogout = () => {
    localStorage.removeItem("veggies_staff_session");
    router.push("/login");
  };

  // Open packing checklist
  const openPackingModal = (order: Order) => {
    setSelectedOrder(order);
    const initialChecklist: Record<string, boolean> = {};
    if (order.order_items) {
      order.order_items.forEach((item) => {
        initialChecklist[item.id] = order.status === "ready_for_pickup";
      });
    }
    setItemChecklist(initialChecklist);
  };

  const toggleItemChecked = (itemId: string) => {
    setItemChecklist((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Transition order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: "preparing" | "ready_for_pickup"
  ) => {
    try {
      const supabase = createClient();
      const updates: any = {
        status: newStatus,
        packer_name: session?.staff_name || "Store Staff",
      };
      if (newStatus === "ready_for_pickup") {
        updates.packed_at = new Date().toISOString();
      }

      await supabase.from("orders").update(updates).eq("id", orderId);

      // Local state update
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...updates } : ord))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, ...updates } : null));
        if (newStatus === "ready_for_pickup") {
          // Close modal after success
          setTimeout(() => setSelectedOrder(null), 800);
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "to_pack") {
      return o.status === "pending" || o.status === "confirmed" || o.status === "preparing";
    }
    if (activeTab === "ready") {
      return o.status === "ready_for_pickup";
    }
    if (activeTab === "dispatched") {
      return o.status === "out_for_delivery" || o.status === "arrived" || o.status === "delivered";
    }
    return true;
  });

  const toPackCount = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || o.status === "preparing"
  ).length;
  const readyCount = orders.filter((o) => o.status === "ready_for_pickup").length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Staff App Bar */}
      <header className="bg-slate-800/95 border-b border-slate-700/80 sticky top-0 z-30 px-4 py-3 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">
                  {session?.store_name || "Veggies Store"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE TERMINAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Picker: <span className="text-slate-200 font-medium">{session?.staff_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute order chimes" : "Unmute order chimes"}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? "bg-slate-700/60 border-slate-600 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 hover:text-white transition"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Shift</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4">
        {/* Quick KPI Strip */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab("to_pack")}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeTab === "to_pack"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                To Pack
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{toPackCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Needs packing</p>
          </button>

          <button
            onClick={() => setActiveTab("ready")}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeTab === "ready"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ready for Rider
              </span>
              <Bike className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{readyCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting pickup</p>
          </button>

          <button
            onClick={() => setActiveTab("dispatched")}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeTab === "dispatched"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Dispatched
              </span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-slate-200 mt-1">
              {orders.filter((o) => o.status === "out_for_delivery" || o.status === "delivered").length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Out or completed</p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order ID or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
            <span>Loading store orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 border border-slate-800 rounded-3xl p-8">
            <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No orders in this queue</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "to_pack"
                ? "All fresh orders are packed! Ready for new customer orders."
                : "No matching orders found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const itemCount = order.order_items?.length || 0;
              const isUrgent = order.status === "pending" || order.status === "confirmed";

              return (
                <div
                  key={order.id}
                  className={`bg-slate-800/90 border rounded-2xl p-4 flex flex-col justify-between transition hover:border-slate-600 ${
                    isUrgent
                      ? "border-amber-500/40 ring-1 ring-amber-500/20"
                      : order.status === "ready_for_pickup"
                      ? "border-emerald-500/30"
                      : "border-slate-700/60"
                  }`}
                >
                  <div>
                    {/* Header: Order ID + Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white tracking-wide">
                        #{order.id.replace("ord-", "")}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === "pending" || order.status === "confirmed"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : order.status === "preparing"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : order.status === "ready_for_pickup"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Customer & Address */}
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-slate-200">
                        {order.customer?.full_name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {order.address?.complete_address || "Indiranagar, Bengaluru"}
                      </p>
                    </div>

                    {/* Items preview */}
                    <div className="mt-3.5 bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-slate-300">
                          {itemCount} {itemCount === 1 ? "Item" : "Items"} to Pick
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{order.net_amount.toFixed(0)} ({order.payment_method})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {order.order_items?.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="text-xs text-slate-300 flex items-center justify-between"
                          >
                            <span className="truncate pr-2">• {item.name}</span>
                            <span className="font-semibold text-slate-400 flex-shrink-0">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                        {itemCount > 3 && (
                          <p className="text-[11px] text-slate-500 italic">
                            +{itemCount - 3} more items...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                    {order.status !== "ready_for_pickup" &&
                    order.status !== "out_for_delivery" &&
                    order.status !== "delivered" ? (
                      <button
                        onClick={() => openPackingModal(order)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Start / Continue Packing
                      </button>
                    ) : (
                      <button
                        onClick={() => openPackingModal(order)}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        View Packed Items
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Packing Checklist Modal / Sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/95">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Order #{selectedOrder.id.replace("ord-", "")}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {selectedOrder.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: {selectedOrder.customer?.full_name} • {selectedOrder.order_items?.length} items
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Checklist progress bar */}
            <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Picking Checklist</span>
              <span className="text-emerald-400 font-mono font-bold">
                {Object.values(itemChecklist).filter(Boolean).length} /{" "}
                {selectedOrder.order_items?.length || 0} Packed
              </span>
            </div>

            {/* Item Checklist Scroll Area */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {selectedOrder.order_items?.map((item) => {
                const isChecked = !!itemChecklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemChecked(item.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-900/80 border-slate-700/80 hover:border-slate-600 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                          isChecked
                            ? "bg-emerald-500 text-white"
                            : "border-2 border-slate-500 text-transparent"
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isChecked ? "line-through text-slate-400" : "text-white"}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Qty: <span className="font-bold text-white">{item.quantity}</span> • ₹{item.price} each
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-700/80 bg-slate-800/95 space-y-2">
              {selectedOrder.status !== "ready_for_pickup" && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, "ready_for_pickup")}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                >
                  <PackageCheck className="w-5 h-5" />
                  Mark Order Packed & Ready for Pickup 📦
                </button>
              )}
              {selectedOrder.status === "pending" && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, "preparing")}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl text-xs transition"
                >
                  Accept & Mark In-Progress
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
