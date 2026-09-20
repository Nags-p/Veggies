"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  X,
  Ban,
  Phone,
  MapPin,
  FileText,
  CheckCheck,
  Sliders,
  Moon,
  CloudRain,
  Zap,
  Timer,
} from "lucide-react";

export default function StaffTerminalPage() {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Store Open/Close & Rush Pause Operations
  const [storeStatus, setStoreStatus] = useState<{
    is_open: boolean;
    closed_reason?: string;
    paused_until?: string | null;
    reopen_at?: string | null;
  }>({ is_open: true });
  const [showStoreOpsModal, setShowStoreOpsModal] = useState(false);
  const [pendingIsOpen, setPendingIsOpen] = useState(true);
  const [pendingReason, setPendingReason] = useState("");
  const [pendingRushMinutes, setPendingRushMinutes] = useState<number | null>(null);
  const [isSavingStoreStatus, setIsSavingStoreStatus] = useState(false);

  // Stepped tabs: "new" -> "packing" -> "ready" -> "dispatched"
  const [activeTab, setActiveTab] = useState<"new" | "packing" | "ready" | "dispatched">("new");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemChecklist, setItemChecklist] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Cancel order modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>("Item(s) out of stock");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Audio Context Ref for reliable continuous ringing
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 🔔 Zomato / Swiggy style ascending bell chime (G5 -> C6 -> E6) at 100% volume
  const playAlertChime = useCallback(() => {
    if (!soundEnabled || isSnoozed || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // 🔔 Swiggy / Zomato order alert: Ascending cheerful bell chime (G5 -> C6 -> E6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.12); // C6
      osc.frequency.setValueAtTime(1318.51, now + 0.24); // E6
      gain.gain.setValueAtTime(1.0, now); // 100% full volume
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio chime prevented by browser:", e);
    }
  }, [soundEnabled, isSnoozed]);

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

  // Unlock browser audio upon any user gesture
  useEffect(() => {
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  // Fetch orders from Supabase (isInitial = true only on manual refresh or component mount)
  const fetchOrders = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
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

      if (!error && data) {
        setOrders(data as Order[]);
        // Keep modal data in sync if staff has an order open
        setSelectedOrder((currentSelected) => {
          if (!currentSelected) return null;
          const updated = (data as Order[]).find((o) => o.id === currentSelected.id);
          return updated || currentSelected;
        });
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Realtime subscription + 15s heartbeat poll for rock-solid POS connectivity
  useEffect(() => {
    if (session) {
      fetchOrders(true); // Initial load with spinner

      const supabase = createClient();
      const channel = supabase
        .channel("staff_order_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            fetchOrders(false); // Silent live refresh
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items" },
          () => {
            fetchOrders(false); // Silent live refresh
          }
        )
        .subscribe();

      // Backup 15s poll in case websocket temporarily disconnects or tablet sleeps
      const pollInterval = setInterval(() => {
        fetchOrders(false);
      }, 15000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [session, fetchOrders]);

  // Continuous sound alarm: loops every 1.5 seconds while there are unaccepted new orders
  const unacceptedOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || (o.status as string) === "placed"
  );
  const hasUnacceptedOrders = unacceptedOrders.length > 0;

  useEffect(() => {
    if (!hasUnacceptedOrders || !soundEnabled || isSnoozed) return;

    // Immediately play once
    playAlertChime();

    // Loop continuously every 1500ms
    const interval = setInterval(() => {
      playAlertChime();
    }, 1500);

    return () => clearInterval(interval);
  }, [hasUnacceptedOrders, soundEnabled, isSnoozed, playAlertChime]);

  // Reset snooze when all unaccepted orders are cleared
  useEffect(() => {
    if (!hasUnacceptedOrders) {
      setIsSnoozed(false);
    }
  }, [hasUnacceptedOrders]);

  const handleLogout = () => {
    localStorage.removeItem("veggies_staff_session");
    router.push("/login");
  };

  // Fetch current store status
  const fetchStoreStatus = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "store_status")
        .maybeSingle();

      if (data?.value) {
        setStoreStatus(data.value);
        setPendingIsOpen(data.value.is_open ?? true);
        setPendingReason(data.value.closed_reason || "");
      }
    } catch (e) {
      console.error("Failed to fetch store status:", e);
    }
  }, []);

  // Subscribe to live store_settings changes
  useEffect(() => {
    fetchStoreStatus();

    const supabase = createClient();
    const settingsChannel = supabase
      .channel("staff_store_settings_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings", filter: "key=eq.store_status" },
        (payload: any) => {
          if (payload.new?.value) {
            setStoreStatus(payload.new.value);
            setPendingIsOpen(payload.new.value.is_open ?? true);
            setPendingReason(payload.new.value.closed_reason || "");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchStoreStatus]);

  const isStoreEffectiveOpen =
    storeStatus.is_open &&
    (!storeStatus.paused_until || new Date(storeStatus.paused_until).getTime() <= Date.now());

  const handleSaveStoreStatus = async () => {
    setIsSavingStoreStatus(true);
    try {
      const supabase = createClient();
      let reopenAtText = "";
      let pausedUntilIso: string | null = null;

      if (!pendingIsOpen) {
        if (pendingRushMinutes) {
          const reopenDate = new Date(Date.now() + pendingRushMinutes * 60 * 1000);
          pausedUntilIso = reopenDate.toISOString();
          reopenAtText = reopenDate.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
      }

      const updatedPayload = {
        is_open: pendingIsOpen,
        closed_reason: pendingIsOpen ? "" : (pendingReason.trim() || "Store is temporarily closed for new orders"),
        paused_until: pendingIsOpen ? null : pausedUntilIso,
        reopen_at: pendingIsOpen ? null : reopenAtText,
        updated_by: session ? `${session.staff_name} (${session.store_name})` : "Store Staff",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert({
          key: "store_status",
          value: updatedPayload,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setStoreStatus(updatedPayload);
      setShowStoreOpsModal(false);
    } catch (err: any) {
      console.error("Failed to update store status:", err);
      alert(`Error updating store status: ${err.message || err}`);
    } finally {
      setIsSavingStoreStatus(false);
    }
  };

  const handleQuickToggleStore = async () => {
    if (isStoreEffectiveOpen) {
      setPendingIsOpen(false);
      setShowStoreOpsModal(true);
      return;
    }

    try {
      const supabase = createClient();
      const updatedPayload = {
        is_open: true,
        closed_reason: "",
        paused_until: null,
        reopen_at: null,
        updated_by: session ? `${session.staff_name} (${session.store_name})` : "Store Staff",
        updated_at: new Date().toISOString(),
      };
      await supabase.from("store_settings").upsert({
        key: "store_status",
        value: updatedPayload,
        updated_at: new Date().toISOString(),
      });
      setStoreStatus(updatedPayload);
    } catch (e: any) {
      console.error("Quick toggle error:", e);
    }
  };

  // Open modal for an order
  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    const initialChecklist: Record<string, boolean> = {};
    if (order.order_items) {
      order.order_items.forEach((item) => {
        initialChecklist[item.id] =
          order.status === "ready_for_pickup" ||
          order.status === "out_for_delivery" ||
          order.status === "delivered";
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

  const checkAllItems = () => {
    if (!selectedOrder?.order_items) return;
    const allChecked: Record<string, boolean> = {};
    selectedOrder.order_items.forEach((item) => {
      allChecked[item.id] = true;
    });
    setItemChecklist(allChecked);
  };

  // Transition order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: "preparing" | "ready_for_pickup" | "out_for_delivery" | "delivered"
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const supabase = createClient();
      const updates: any = {
        status: newStatus,
        packer_name: session?.store_name
          ? `Staff (${session.store_name})`
          : (session?.staff_name || "Store Staff"),
      };
      if (newStatus === "ready_for_pickup") {
        updates.packed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) {
        console.error("Database update failed:", error);
        alert(`Failed to update status in database: ${error.message}`);
        return;
      }

      // Update local state
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...updates } : ord))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, ...updates } : null));
      }

      // Background sync with database
      fetchOrders(false);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(`Error updating order: ${err?.message || "Unknown error"}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Cancel order with reason
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    const finalReason =
      cancelReasonPreset === "Other"
        ? customCancelReason.trim() || "Cancelled by store staff"
        : cancelReasonPreset;

    setIsSubmittingCancel(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancel_reason: finalReason,
        })
        .eq("id", cancellingOrder.id);

      if (error) {
        alert(`Failed to cancel order: ${error.message}`);
        return;
      }

      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === cancellingOrder.id
            ? { ...ord, status: "cancelled", cancel_reason: finalReason }
            : ord
        )
      );

      if (selectedOrder?.id === cancellingOrder.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: "cancelled", cancel_reason: finalReason } : null
        );
      }

      // Background sync with database
      fetchOrders(false);

      setCancellingOrder(null);
      setCustomCancelReason("");
    } catch (err: any) {
      alert(`Error cancelling order: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Counts for each step
  const newCount = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed"
  ).length;
  const packingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready_for_pickup").length;
  const dispatchedCount = orders.filter((o) =>
    ["out_for_delivery", "arrived", "delivered", "cancelled", "instore"].includes(o.status)
  ).length;

  // Filter orders by active tab
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.address?.building_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.address?.complete_address?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "new") {
      return o.status === "pending" || o.status === "confirmed";
    }
    if (activeTab === "packing") {
      return o.status === "preparing";
    }
    if (activeTab === "ready") {
      return o.status === "ready_for_pickup";
    }
    if (activeTab === "dispatched") {
      return ["out_for_delivery", "arrived", "delivered", "cancelled", "instore"].includes(o.status);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Persistent Audio Alarm Banner */}
      {hasUnacceptedOrders && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between border-b border-amber-400/40 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black tracking-wide flex items-center gap-2">
                <span>{unacceptedOrders.length} NEW ORDER{unacceptedOrders.length > 1 ? "S" : ""} AWAITING ACCEPTANCE!</span>
                <span className="inline-block px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono">
                  ALARM RINGING
                </span>
              </p>
              <p className="text-[11px] text-amber-100/90 hidden sm:block">
                Sound will continue playing until orders are accepted or cancelled with reason.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSnoozed(!isSnoozed)}
              className="px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/40 border border-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSnoozed ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Resume Sound</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Silence (Mute)</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("new");
                if (unacceptedOrders[0]) openOrderModal(unacceptedOrders[0]);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-amber-50 shadow transition flex items-center gap-1 cursor-pointer"
            >
              Review Now ➔
            </button>
          </div>
        </div>
      )}

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
                Staff: <span className="text-slate-200 font-medium">{session?.staff_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Test Bell Chime */}
            <button
              onClick={playAlertChime}
              title="Test Zomato/Swiggy Order Bell"
              className="px-2.5 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔔 Test Bell</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute order chimes" : "Unmute order chimes"}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                soundEnabled
                  ? "bg-slate-700/60 border-slate-600 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Shift</span>
            </button>
          </div>
        </div>
      </header>

      {/* Store Operations & Rush Control Banner */}
      <div className="bg-slate-800/90 border-b border-slate-700/60 px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStoreEffectiveOpen ? "bg-emerald-400" : "bg-red-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isStoreEffectiveOpen ? "bg-emerald-500" : "bg-red-500"}`}></span>
            </span>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black tracking-wider uppercase ${isStoreEffectiveOpen ? "text-emerald-400" : "text-red-400"}`}>
                  {isStoreEffectiveOpen ? "Store is Online • Accepting Orders" : "Store is Closed / Orders Paused"}
                </span>
                {storeStatus.reopen_at && !isStoreEffectiveOpen && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⏱️ Reopening at {storeStatus.reopen_at}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {isStoreEffectiveOpen
                  ? "Customers can browse and place fresh delivery orders in real-time."
                  : (storeStatus.closed_reason || "New orders are temporarily stopped on customer app.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPendingIsOpen(storeStatus.is_open);
                setPendingReason(storeStatus.closed_reason || "");
                setShowStoreOpsModal(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rush & Status Controls</span>
            </button>

            <button
              onClick={handleQuickToggleStore}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isStoreEffectiveOpen
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
                  : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 border border-emerald-400"
              }`}
            >
              {isStoreEffectiveOpen ? "Pause Orders" : "Open Store"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4">
        {/* Stepped Workflow Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Step 1: New Orders */}
          <button
            onClick={() => setActiveTab("new")}
            className={`p-3 rounded-2xl border text-left transition relative overflow-hidden cursor-pointer ${
              activeTab === "new"
                ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. New Orders
              </span>
              {newCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                  NEW
                </span>
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{newCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">View & Accept / Cancel</p>
          </button>

          {/* Step 2: Packing */}
          <button
            onClick={() => setActiveTab("packing")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              activeTab === "packing"
                ? "bg-blue-500/15 border-blue-500/60 shadow-lg shadow-blue-500/10"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Packing
              </span>
              <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{packingCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Picking checklist</p>
          </button>

          {/* Step 3: Ready for Dispatch */}
          <button
            onClick={() => setActiveTab("ready")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              activeTab === "ready"
                ? "bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                3. Ready to Dispatch
              </span>
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{readyCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting rider pickup</p>
          </button>

          {/* Step 4: Dispatched & Delivered */}
          <button
            onClick={() => setActiveTab("dispatched")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              activeTab === "dispatched"
                ? "bg-slate-700/60 border-slate-500/60 shadow-lg shadow-slate-700/20"
                : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Completed
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-200 mt-1">{dispatchedCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Out or completed</p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, building or address..."
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
            <h3 className="text-base font-semibold text-slate-300">
              {activeTab === "new"
                ? "No pending new orders"
                : activeTab === "packing"
                ? "No orders currently being packed"
                : activeTab === "ready"
                ? "No orders waiting for dispatch"
                : "No completed orders found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "new"
                ? "All fresh orders have been accepted! The alarm will ring automatically when a new order arrives."
                : "Select another tab to inspect active or completed store orders."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const itemCount = order.order_items?.length || 0;
              const isNew = order.status === "pending" || order.status === "confirmed";
              const isPacking = order.status === "preparing";
              const isReady = order.status === "ready_for_pickup";
              const isCancelled = order.status === "cancelled";
              const isDelivered = order.status === "delivered" || order.status === "instore";

              return (
                <div
                  key={order.id}
                  className={`bg-slate-800/90 border rounded-2xl p-4 flex flex-col justify-between transition hover:border-slate-600 shadow-sm ${
                    isNew
                      ? "border-amber-500/50 ring-2 ring-amber-500/20 bg-amber-950/10"
                      : isPacking
                      ? "border-blue-500/40"
                      : isReady
                      ? "border-emerald-500/40"
                      : "border-slate-700/60"
                  }`}
                >
                  <div>
                    {/* Header: Order ID + Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wide">
                        #{order.id.replace("ord-", "").slice(0, 16)}...
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isNew
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                            : isPacking
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : isReady
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : isCancelled
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : isDelivered
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {isNew ? "Awaiting Acceptance" : (order.status === "instore" ? "In-Store" : order.status.replace(/_/g, " "))}
                      </span>
                    </div>

                    {/* Customer & Address */}
                    <div className="mt-3">
                      <p className="text-sm font-bold text-slate-200">
                        {order.customer?.full_name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {order.address?.building_name
                          ? `${order.address.building_name}, ${order.address.complete_address || ""}`
                          : order.address?.complete_address || "Customer Address"}
                      </p>
                      {order.cancel_reason && (
                        <p className="text-xs text-red-400 mt-1 font-medium italic">
                          Reason: {order.cancel_reason}
                        </p>
                      )}
                    </div>

                    {/* Items preview */}
                    <div className="mt-3.5 bg-slate-900/70 rounded-xl p-3 border border-slate-700/50">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-slate-300">
                          {itemCount} {itemCount === 1 ? "Item" : "Items"}
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

                  {/* Actions according to step */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                    {/* STEP 1: New Orders -> View & Accept + Cancel */}
                    {isNew && (
                      <>
                        <button
                          onClick={() => openOrderModal(order)}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          View & Accept
                        </button>
                        <button
                          onClick={() => setCancellingOrder(order)}
                          className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                          title="Cancel Order"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* STEP 2: Packing -> Continue Packing (Picking Checklist) */}
                    {isPacking && (
                      <button
                        onClick={() => openOrderModal(order)}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Packing Checklist
                      </button>
                    )}

                    {/* STEP 3: Ready for Pickup -> Handover to Rider */}
                    {isReady && (
                      <>
                        <button
                          disabled={updatingOrderId === order.id}
                          onClick={() => updateOrderStatus(order.id, "out_for_delivery")}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <Bike className="w-4 h-4" />
                          {updatingOrderId === order.id ? "Dispatching..." : "Hand Over to Rider 🛵"}
                        </button>
                        <button
                          onClick={() => openOrderModal(order)}
                          className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                          title="View order items"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* STEP 4: Completed / Dispatched / Cancelled -> View Order Details (NO CHECKBOXES) */}
                    {!isNew && !isPacking && !isReady && (
                      <button
                        onClick={() => openOrderModal(order)}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        View Order Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Main Order Modal (Dynamic based on order status) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/95">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Order #{selectedOrder.id.replace("ord-", "").slice(0, 16)}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedOrder.status === "pending" || selectedOrder.status === "confirmed"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : selectedOrder.status === "preparing"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : selectedOrder.status === "ready_for_pickup"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : selectedOrder.status === "cancelled"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-slate-700 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {selectedOrder.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: {selectedOrder.customer?.full_name || "Customer"} •{" "}
                  {selectedOrder.order_items?.length || 0} items
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer & Address Details Card */}
            <div className="p-4 bg-slate-900/50 border-b border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Phone: <span className="text-slate-200 font-semibold">{selectedOrder.customer?.phone || "N/A"}</span>
                </span>
                <span className="text-slate-400">
                  Payment: <span className="text-emerald-400 font-bold">{selectedOrder.payment_method} ({selectedOrder.payment_status})</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">
                  {selectedOrder.address?.building_name ? `${selectedOrder.address.building_name}, ` : ""}
                  {selectedOrder.address?.complete_address || "Customer address"}
                </span>
              </div>
              {selectedOrder.delivery_notes && (
                <p className="text-amber-300/90 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Note: {selectedOrder.delivery_notes}
                </p>
              )}
            </div>

            {/* STATUS-SPECIFIC BODY */}

            {/* 1. NEW ORDERS (Awaiting Acceptance) */}
            {(selectedOrder.status === "pending" || selectedOrder.status === "confirmed") && (
              <>
                <div className="px-4 py-3 bg-amber-500/15 border-b border-amber-500/30 flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Bell className="w-4 h-4 animate-bounce text-amber-400 flex-shrink-0" />
                  <span>Incoming order. Accept to start packing or cancel with reason to silence the alarm.</span>
                </div>

                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Items to Prepare ({selectedOrder.order_items?.length || 0})
                  </h4>
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          Qty: <span className="font-bold text-white">{item.quantity}</span> • ₹{item.price} each
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-200">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Actions for New Order */}
                <div className="p-4 border-t border-slate-700/80 bg-slate-800/95 space-y-2.5">
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={async () => {
                      await updateOrderStatus(selectedOrder.id, "preparing");
                      setActiveTab("packing");
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {updatingOrderId === selectedOrder.id
                      ? "Accepting Order..."
                      : "Accept Order & Start Packing ➔"}
                  </button>

                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={() => setCancellingOrder(selectedOrder)}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Order with Reason
                  </button>
                </div>
              </>
            )}

            {/* 2. PACKING IN PROGRESS -> Interactive Picking Checklist */}
            {selectedOrder.status === "preparing" && (
              <>
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">Picking Checklist</span>
                    <button
                      onClick={checkAllItems}
                      className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition cursor-pointer"
                    >
                      Check All
                    </button>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">
                    {Object.values(itemChecklist).filter(Boolean).length} /{" "}
                    {selectedOrder.order_items?.length || 0} Packed
                  </span>
                </div>

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
                            <p
                              className={`text-sm font-semibold ${
                                isChecked ? "line-through text-slate-400" : "text-white"
                              }`}
                            >
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

                {/* Footer for Packing */}
                <div className="p-4 border-t border-slate-700/80 bg-slate-800/95 space-y-2">
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={async () => {
                      await updateOrderStatus(selectedOrder.id, "ready_for_pickup");
                      setActiveTab("ready");
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition cursor-pointer"
                  >
                    <PackageCheck className="w-5 h-5" />
                    {updatingOrderId === selectedOrder.id
                      ? "Marking Packed..."
                      : "Mark Order Packed & Ready to Dispatch 📦"}
                  </button>

                  <button
                    onClick={() => setCancellingOrder(selectedOrder)}
                    className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel Order
                  </button>
                </div>
              </>
            )}

            {/* 3. READY TO DISPATCH -> Packed, waiting for driver */}
            {selectedOrder.status === "ready_for_pickup" && (
              <>
                <div className="px-4 py-3 bg-emerald-500/15 border-b border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>All items packed and ready! Hand over package to the assigned delivery rider.</span>
                </div>

                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Packed Package Contents ({selectedOrder.order_items?.length || 0})
                  </h4>
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">Qty: {item.quantity} • ₹{item.price} each</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-300">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-slate-700/80 bg-slate-800/95 space-y-2">
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={async () => {
                      await updateOrderStatus(selectedOrder.id, "out_for_delivery");
                      setActiveTab("dispatched");
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm transition cursor-pointer"
                  >
                    <Bike className="w-5 h-5" />
                    {updatingOrderId === selectedOrder.id
                      ? "Dispatching..."
                      : "Hand Over to Delivery Partner 🛵 (Out for Delivery)"}
                  </button>
                </div>
              </>
            )}

            {/* 4. COMPLETED / DELIVERED / OUT FOR DELIVERY / CANCELLED -> CLEAN RECEIPT (NO CHECKBOXES!) */}
            {["out_for_delivery", "arrived", "delivered", "cancelled"].includes(
              selectedOrder.status
            ) && (
              <>
                {/* Status banner */}
                <div
                  className={`px-4 py-3 border-b flex items-center gap-2.5 text-xs font-semibold ${
                    selectedOrder.status === "delivered" || selectedOrder.status === "instore"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : selectedOrder.status === "cancelled"
                      ? "bg-red-500/15 border-red-500/30 text-red-300"
                      : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                  }`}
                >
                  {selectedOrder.status === "instore" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold">In-Store Counter Purchase</p>
                        <p className="text-[11px] text-emerald-400/80">
                          Billed & Completed at Physical POS Counter
                        </p>
                      </div>
                    </>
                  ) : selectedOrder.status === "delivered" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Order Delivered to Customer</p>
                        {selectedOrder.delivered_at && (
                          <p className="text-[11px] text-emerald-400/80">
                            Completed at {new Date(selectedOrder.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </>
                  ) : selectedOrder.status === "cancelled" ? (
                    <>
                      <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Order Cancelled</p>
                        <p className="text-[11px] text-red-300/90">
                          Reason: <span className="font-bold text-white">{selectedOrder.cancel_reason || "Cancelled by store"}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Bike className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Out for Delivery</p>
                        <p className="text-[11px] text-blue-300/80">Package handed over to delivery rider</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Clean Itemized Receipt - STRICTLY NO CHECKBOXES */}
                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <span>Order Receipt</span>
                    <span>{selectedOrder.order_items?.length || 0} Total Items</span>
                  </div>

                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          Qty: <span className="font-bold text-slate-200">{item.quantity}</span> • ₹{item.price} each
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-200">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}

                  {/* Financial Breakdown */}
                  <div className="mt-4 pt-3 border-t border-slate-700/70 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Item Total</span>
                      <span>₹{selectedOrder.total_amount?.toFixed(0)}</span>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount</span>
                        <span>-₹{selectedOrder.discount_amount?.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>₹{selectedOrder.delivery_fee?.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-700">
                      <span>Total Net Paid</span>
                      <span className="text-emerald-400 font-mono">₹{selectedOrder.net_amount?.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer for Completed */}
                <div className="p-4 border-t border-slate-700/80 bg-slate-800/95">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Close Order View
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Order Reason Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Cancel Order #{cancellingOrder.id.replace("ord-", "").slice(0, 16)}</span>
              </div>
              <button
                onClick={() => setCancellingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Please select or enter a cancellation reason. This will cancel the order in the system, silence the audio alarm, and notify the customer.
              </p>

              <div className="space-y-2">
                {[
                  "Item(s) out of stock",
                  "Store closed or closing soon",
                  "Customer requested cancellation",
                  "Delivery address outside service zone",
                  "Store overloaded / unable to fulfill",
                  "Other",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                      cancelReasonPreset === reason
                        ? "bg-red-500/10 border-red-500/50 text-red-200 font-semibold"
                        : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReasonPreset === reason}
                      onChange={() => setCancelReasonPreset(reason)}
                      className="accent-red-500 cursor-pointer"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {cancelReasonPreset === "Other" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Specify Custom Reason:</label>
                  <textarea
                    rows={2}
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Enter reason for cancellation..."
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-850 flex items-center justify-end gap-2">
              <button
                disabled={isSubmittingCancel}
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Operations & Rush Control Center Modal */}
      {showStoreOpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-left text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    Store Operations & Live Availability
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Terminal control for <strong className="text-slate-200">{session?.store_name || "Store"}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStoreOpsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feature 1: Master Store Status Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                1. Operational Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingIsOpen(true);
                    setPendingRushMinutes(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    pendingIsOpen
                      ? "bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-emerald-400">OPEN</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Accepting customer orders normally</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingIsOpen(false)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    !pendingIsOpen
                      ? "bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-red-400">CLOSED / PAUSED</span>
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Temporarily stop orders on customer app</p>
                </button>
              </div>
            </div>

            {/* Feature 2: Rush Pause Presets (Only visible when closing/pausing) */}
            {!pendingIsOpen && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-amber-400" />
                    Rush Pause Presets (Auto-reopen timer)
                  </span>
                  {pendingRushMinutes && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Pause {pendingRushMinutes}m
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "15 Mins", minutes: 15, sub: "Quick catch-up" },
                    { label: "30 Mins", minutes: 30, sub: "High rush surge" },
                    { label: "60 Mins", minutes: 60, sub: "Rain / Restock" },
                  ].map((preset) => (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => {
                        if (pendingRushMinutes === preset.minutes) {
                          setPendingRushMinutes(null);
                        } else {
                          setPendingRushMinutes(preset.minutes);
                          if (!pendingReason) {
                            setPendingReason(`Orders paused for ${preset.minutes} mins due to high rush backlog.`);
                          }
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        pendingRushMinutes === preset.minutes
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm shadow-amber-500/10"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <span className="text-xs font-black block">{preset.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{preset.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feature 3: Customer Announcement Reason */}
            {!pendingIsOpen && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Announcement Reason
                </label>
                
                {/* Quick preset chips */}
                <div className="flex flex-col gap-1.5">
                  {[
                    "🌧️ Heavy rain in area — delivery temporarily paused",
                    "⚡ High order volume surge — pausing new orders for catchup",
                    "📦 Fresh stock arrival — store closed for restocking",
                    "🌙 Store is closed for the night. Reopening at 6:00 AM",
                  ].map((presetText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPendingReason(presetText)}
                      className={`text-[11px] font-semibold p-2 rounded-xl border transition cursor-pointer text-left ${
                        pendingReason === presetText
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      {presetText}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Or write custom message:</label>
                  <input
                    type="text"
                    placeholder="e.g. Offline for 20 mins due to power outage..."
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStoreOpsModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStoreStatus}
                disabled={isSavingStoreStatus}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSavingStoreStatus ? "Broadcasting..." : "Save & Update Customer App"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
