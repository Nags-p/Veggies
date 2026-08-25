"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Phone, Shield, LogOut, Loader2, ArrowLeft, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [updating, setUpdating] = useState(false);

  // Store Timings States
  const [storeOpenTime, setStoreOpenTime] = useState<string>("08:00");
  const [storeCloseTime, setStoreCloseTime] = useState<string>("22:00");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Weekday Checklist Selector
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

  // Delivery Settings States
  const [deliveryFee, setDeliveryFee] = useState<number>(30);
  const [minFreeDeliveryAmount, setMinFreeDeliveryAmount] = useState<number>(250);
  const [savingDelivery, setSavingDelivery] = useState<boolean>(false);



  // Helper to parse database days string
  const parseDays = (daysStr: string) => {
    if (!daysStr) return weekdays;
    const clean = daysStr.toLowerCase();
    if (clean.includes("mon - sun") || clean.includes("mon-sun")) {
      return weekdays;
    }
    if (clean.includes("mon - fri") || clean.includes("mon-fri")) {
      return ["Mon", "Tue", "Wed", "Thu", "Fri"];
    }
    return weekdays.filter(day => CleanDaysMatch(daysStr, day));
  };

  const CleanDaysMatch = (str: string, day: string) => {
    return str.includes(day);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login?redirect=/settings");
          return;
        }
        setUser(user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch Settings (Timings & Delivery Settings)
        const { data: dbSettings } = await supabase
          .from("store_settings")
          .select("key, value");

        if (dbSettings) {
          dbSettings.forEach((row: any) => {
            if (row.key === "store_timings") {
              setStoreOpenTime(row.value.open_time || "08:00");
              setStoreCloseTime(row.value.close_time || "22:00");
              setSelectedDays(parseDays(row.value.days));
            }
            if (row.key === "delivery_settings") {
              setDeliveryFee(row.value.delivery_fee || 30);
              setMinFreeDeliveryAmount(row.value.min_free_delivery_amount || 250);
            }
          });
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, supabase]);

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      alert("Name is required");
      return;
    }
    try {
      setUpdating(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null
        })
        .eq("id", user.id);

      if (error) throw error;
      
      setProfile((prev: any) => ({
        ...prev,
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null
      }));
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveStoreTimings = async () => {
    try {
      setSavingSettings(true);
      // Format days selection
      let daysString = selectedDays.join(", ");
      if (selectedDays.length === 7) daysString = "Mon - Sun";
      if (selectedDays.length === 5 && !selectedDays.includes("Sat") && !selectedDays.includes("Sun")) {
        daysString = "Mon - Fri";
      }
      
      const { error } = await supabase
        .from("store_settings")
        .update({ value: { open_time: storeOpenTime, close_time: storeCloseTime, days: daysString } })
        .eq("key", "store_timings");
        
      if (error) throw error;
      alert("Store operating settings saved successfully! 🎉");
    } catch (err) {
      console.error(err);
      alert("Failed to save timings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    try {
      setSavingDelivery(true);
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          key: "delivery_settings",
          value: {
            delivery_fee: Number(deliveryFee),
            min_free_delivery_amount: Number(minFreeDeliveryAmount)
          }
        }, { onConflict: "key" });

      if (error) throw error;
      alert("Delivery charges updated successfully! 🚚");
    } catch (err) {
      console.error(err);
      alert("Failed to save delivery settings.");
    } finally {
      setSavingDelivery(false);
    }
  };


  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      alert("Failed to sign out");
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="mb-2 text-left">
          <Link href="/">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-primary transition-colors cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </span>
          </Link>
        </div>

        {/* Profile Card */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 md:p-8 flex flex-col justify-between gap-6"
          >
            {isEditing ? (
              <div className="w-full space-y-4 text-left">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Edit Profile Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Full Name*</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-200 rounded-button text-slate-500 font-extrabold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-button shadow-premium transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-none">
                      {profile.full_name}
                    </h1>
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold pt-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{profile.email || "No email added"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{profile.phone || "No phone number added"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setEditName(profile.full_name);
                      setEditPhone(profile.phone || "");
                      setEditEmail(profile.email || "");
                      setIsEditing(true);
                    }}
                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-5 py-3 rounded-button transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-premium cursor-pointer"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full sm:w-auto border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs px-5 py-3 rounded-button transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-slate-400" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Store Timings & Operating Days Settings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 md:p-8 space-y-6 text-left"
        >
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Store Timings & operating Days</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">Configure when customers are allowed to place orders.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Open Time (24h)</label>
                <input
                  type="time"
                  value={storeOpenTime}
                  onChange={(e) => setStoreOpenTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary transition-all text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Close Time (24h)</label>
                <input
                  type="time"
                  value={storeCloseTime}
                  onChange={(e) => setStoreCloseTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary transition-all text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Select Operating Days</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {weekdays.map((day) => {
                  const isChecked = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? "bg-primary border-primary text-white"
                          : "bg-slate-50 border-slate-250 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50">
            <button
              onClick={handleSaveStoreTimings}
              disabled={savingSettings || selectedDays.length === 0}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-button shadow-premium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Save Operating Settings"}
            </button>
          </div>
        </motion.div>

        {/* Delivery Fee Settings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 md:p-8 space-y-6 text-left"
        >
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Delivery Charges Manager</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">Control the delivery fees and free delivery tier thresholds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Delivery Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary transition-all text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Min Order for Free Delivery (₹)</label>
              <input
                type="number"
                min="0"
                value={minFreeDeliveryAmount}
                onChange={(e) => setMinFreeDeliveryAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-primary transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50">
            <button
              onClick={handleSaveDeliverySettings}
              disabled={savingDelivery}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-button shadow-premium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {savingDelivery ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Save Delivery Settings"}
            </button>
          </div>
        </motion.div>
      </main>

      <FooterNav />
    </div>
  );
}
