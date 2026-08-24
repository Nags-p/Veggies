"use client";

import React, { useState, useEffect } from "react";
import { Send, Bell, User, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationManager() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"promo" | "general">("promo");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, role, fcm_token")
          .order("full_name", { ascending: true });

        if (error) throw error;
        setProfiles(data || []);
      } catch (err: any) {
        console.error("Error fetching profiles:", err);
        setStatus({ text: "Failed to load customer profiles.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  const customers = profiles.filter((p) => p.role === "customer");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatus({ text: "Title and message are required.", type: "error" });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      if (targetId === "all") {
        if (customers.length === 0) {
          throw new Error("No customer profiles found to notify.");
        }
        
        // Batch insert notifications for all customers
        const notificationRows = customers.map((customer) => ({
          profile_id: customer.id,
          title: title.trim(),
          message: message.trim(),
          type: type,
        }));

        const { error } = await supabase.from("notifications").insert(notificationRows);
        if (error) throw error;

        setStatus({
          text: `Successfully broadcasted notification to all ${customers.length} customers!`,
          type: "success",
        });
      } else {
        // Send to a single selected customer
        const { error } = await supabase.from("notifications").insert({
          profile_id: targetId,
          title: title.trim(),
          message: message.trim(),
          type: type,
        });
        if (error) throw error;

        const targetName = customers.find((c) => c.id === targetId)?.full_name || "Customer";
        setStatus({
          text: `Successfully sent notification to ${targetName}!`,
          type: "success",
        });
      }

      // Reset form
      setTitle("");
      setMessage("");
    } catch (err: any) {
      console.error("Error sending notification:", err);
      setStatus({ text: err.message || "Failed to send notification.", type: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-premium max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Push Notifications Portal</h2>
          <p className="text-xs text-slate-400">Broadcast marketing promos or send system alerts to users</p>
        </div>
      </div>

      {status && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
            status.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{status.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading customers...</span>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Recipient Target
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
              >
                <option value="all">📢 Broadcast to All Customers ({customers.length})</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.full_name || "Anonymous"} ({c.phone || c.email || "No Contact"}) {c.fcm_token ? "• Push Active" : "• Offline"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Alert Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
              >
                <option value="promo">🏷️ Promotional / Marketing (Banners, Discounts)</option>
                <option value="general">🔔 General Alert / Info Updates</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. Weekend Flash Sale! 🍓"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Message Body
            </label>
            <textarea
              rows={4}
              placeholder="Write your promo copy or notification message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
