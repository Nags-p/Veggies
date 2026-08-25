"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, BellOff, CheckCheck, ShoppingBag, Tag, Info, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order" | "promo" | "general";
  read: boolean;
  created_at: string;
  image_url?: string | null;
  redirect_to?: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function initUserAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      await loadNotifications(user.id);
    }
    initUserAndLoad();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to realtime database updates
    const channel = supabase
      .channel(`page-notifications-${userId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${userId}`
        },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => (n.id === updatedNotif.id ? updatedNotif : n))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedNotif = payload.old as { id: string };
            setNotifications(prev => prev.filter(n => n.id !== deletedNotif.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadNotifications(uid: string) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  const markAsRead = async (id: string, redirectTo?: string | null) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
    } catch (err) {
      console.error("Failed to mark notification as read in database:", err);
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("profile_id", userId)
        .eq("read", false);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        );
      case "promo":
        return (
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Tag className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Info className="h-5 w-5" />
          </div>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-20 md:pb-8">
      <Header hideSearch />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {/* Page title & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary text-white font-extrabold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-semibold">Stay updated with your orders and deals</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs font-extrabold text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-xl border border-primary/20 hover:border-primary/45 hover:bg-emerald-50 bg-white"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-card flex flex-col items-center justify-center gap-4 py-16"
          >
            <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400">
              <BellOff className="h-10 w-10" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                You have no notifications right now. Check back later for updates!
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="mt-2 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-button shadow-premium transition-all duration-150"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          /* Notifications list */
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => markAsRead(notification.id, notification.redirect_to)}
                  className={`p-4 rounded-2xl border transition-all duration-150 flex items-start justify-between gap-4 cursor-pointer relative overflow-hidden group hover:shadow-premium select-none ${
                    notification.read
                      ? "bg-white border-slate-100 hover:border-slate-200/80"
                      : "bg-white border-primary/20 shadow-md ring-1 ring-primary/5 hover:border-primary/40"
                  }`}
                >
                  {/* Left: Icon */}
                  {getIcon(notification.type)}

                  {/* Center: Title & Body */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className={`text-xs truncate group-hover:text-primary transition-colors ${
                        notification.read ? "font-bold text-slate-800" : "font-black text-slate-900"
                      }`}>
                        {notification.title}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed break-words">
                      {notification.message}
                    </p>

                    {notification.image_url && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-100 max-w-[200px]">
                        <img
                          src={notification.image_url}
                          alt="Notification Visual"
                          className="w-full h-auto object-cover max-h-32 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Unread Indicator or Chevron */}
                  <div className="flex items-center self-center shrink-0">
                    {!notification.read ? (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <FooterNav />
    </div>
  );
}
