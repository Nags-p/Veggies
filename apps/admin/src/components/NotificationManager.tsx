"use client";

import React, { useState, useEffect } from "react";
import { Send, Bell, User, Loader2, AlertCircle, BarChart3, Clock, Eye, EyeOff, Image as ImageIcon, Link as LinkIcon, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationManager() {
  const supabase = createClient();
  const [subTab, setSubTab] = useState<"send" | "stats">("send");
  
  // Data lists
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Composer fields
  const [targetId, setTargetId] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [redirectType, setRedirectType] = useState<"none" | "home" | "cart" | "profile" | "product" | "custom">("home");
  const [selectedProductSlug, setSelectedProductSlug] = useState("");
  const [customRedirectPath, setCustomRedirectPath] = useState("");
  const [type, setType] = useState<"promo" | "general">("promo");
  
  // Status states
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch initial profile and product data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch profiles
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, role, fcm_token")
          .order("full_name", { ascending: true });
        if (profErr) throw profErr;
        setProfiles(profData || []);

        // Fetch products for redirect dropdown
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("id, name, slug")
          .order("name", { ascending: true });
        if (prodErr) throw prodErr;
        setProducts(prodData || []);
      } catch (err: any) {
        console.error("Error fetching admin composer data:", err);
        setStatus({ text: "Failed to load active catalog data.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch stats and log history
  async function fetchHistoryAndStats() {
    setRefreshingStats(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id, 
          title, 
          message, 
          type, 
          read, 
          image_url, 
          redirect_to, 
          created_at, 
          profiles (full_name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error("Error fetching notification history:", err);
    } finally {
      setRefreshingStats(false);
    }
  }

  useEffect(() => {
    if (subTab === "stats") {
      fetchHistoryAndStats();
    }
  }, [subTab]);

  const customers = profiles.filter((p) => p.role === "customer");

  // Determine redirection path
  function getRedirectPath(): string {
    switch (redirectType) {
      case "home": return "/";
      case "cart": return "/cart";
      case "profile": return "/profile";
      case "product": return selectedProductSlug ? `/product/${selectedProductSlug}` : "/product";
      case "custom": return customRedirectPath.trim();
      default: return "";
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatus({ text: "Title and message are required.", type: "error" });
      return;
    }

    setSending(true);
    setStatus(null);

    const redirectPath = getRedirectPath();

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
          image_url: imageUrl.trim() || null,
          redirect_to: redirectPath || null,
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
          image_url: imageUrl.trim() || null,
          redirect_to: redirectPath || null,
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
      setImageUrl("");
      setRedirectType("none");
      setSelectedProductSlug("");
      setCustomRedirectPath("");
    } catch (err: any) {
      console.error("Error sending notification:", err);
      setStatus({ text: err.message || "Failed to send notification.", type: "error" });
    } finally {
      setSending(false);
    }
  }

  // Calculate statistics
  const totalSent = history.length;
  const readCount = history.filter((h) => h.read).length;
  const unreadCount = totalSent - readCount;
  const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-premium max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Push Notifications Portal</h2>
            <p className="text-xs text-slate-400">Broadcast marketing promos or send system alerts to users</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setSubTab("send")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "send" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Send Notification
          </button>
          <button
            onClick={() => setSubTab("stats")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "stats" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Stats & History
          </button>
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
          <span className="text-xs text-slate-400 font-medium">Loading catalog...</span>
        </div>
      ) : subTab === "send" ? (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Promo Image URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://example.com/promo-banner.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                On-Click Redirect Path
              </label>
              <select
                value={redirectType}
                onChange={(e) => setRedirectType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
              >
                <option value="none">No Redirection (Open App Normally)</option>
                <option value="home">🏠 Home Page</option>
                <option value="cart">🛒 Shopping Cart</option>
                <option value="profile">👤 Customer Profile</option>
                <option value="product">🍏 Specific Product details</option>
                <option value="custom">⚙️ Custom Redirect Route</option>
              </select>
            </div>

            {/* Dynamic Redirect parameters */}
            {redirectType === "product" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Redirect Product
                </label>
                <select
                  value={selectedProductSlug}
                  onChange={(e) => setSelectedProductSlug(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                >
                  <option value="">-- Choose a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {redirectType === "custom" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Input App Route (relative)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /category/fruits"
                  value={customRedirectPath}
                  onChange={(e) => setCustomRedirectPath(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                />
              </div>
            )}
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
      ) : (
        /* Stats & History sub-tab */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metrics Overview</h3>
            <button
              onClick={fetchHistoryAndStats}
              disabled={refreshingStats}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${refreshingStats ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Sent</div>
              <div className="text-xl font-extrabold text-slate-800">{totalSent}</div>
              <div className="text-[9px] text-slate-400 font-medium mt-1">in recent logs</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-emerald-600">
                <Eye className="h-3 w-3" />
                Read count
              </div>
              <div className="text-xl font-extrabold text-slate-800">{readCount}</div>
              <div className="text-[9px] text-slate-400 font-medium mt-1">user opened</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-500">
                <EyeOff className="h-3 w-3" />
                Unread count
              </div>
              <div className="text-xl font-extrabold text-slate-800">{unreadCount}</div>
              <div className="text-[9px] text-slate-400 font-medium mt-1">pending view</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Open Rate</div>
              <div className="text-xl font-extrabold text-emerald-800">{readRate}%</div>
              <div className="text-[9px] text-emerald-500 font-medium mt-1">read vs unread</div>
            </div>
          </div>

          {/* Log History list */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Logs</h3>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                    <th className="p-3">Title</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Redirect Path</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No push history found. Send some notifications!
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">
                          <div className="flex flex-col">
                            <span>{h.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{h.message}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold">{h.profiles?.full_name || "Unknown"}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{h.profiles?.phone || ""}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            h.type === "promo" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">
                          {h.redirect_to || "Open App"}
                        </td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1 text-[10px] font-bold ${
                            h.read ? "text-emerald-600" : "text-slate-400"
                          }`}>
                            {h.read ? (
                              <>
                                <Eye className="h-3.5 w-3.5" /> Read
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5" /> Sent
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[10px]">
                          {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="block text-[8px]">{new Date(h.created_at).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
