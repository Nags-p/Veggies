"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User as UserIcon, Mail, Phone, Shield, MapPin, ShoppingBag, LogOut, ChevronRight, Loader2, ArrowRight, LayoutDashboard, ShoppingBasket, ShoppingCart, Tag, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
// Sign out handled client-side directly via supabase client
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import Link from "next/link";
import { useData } from "@/context/DataContext";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface Address {
  id: string;
  name: string;
  building_name: string;
  complete_address: string;
  is_default: boolean;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  net_amount: number;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    profile,
    addresses,
    orders,
    profileLoading,
    updateProfileLocal
  } = useData();

  const [signOutLoading, setSignOutLoading] = useState(false);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.push("/login");
    }
  }, [profile, profileLoading, router]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
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
        .eq("id", profile.id);

      if (error) throw error;
      
      // Update local state
      updateProfileLocal({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      alert(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login");
    } else {
      alert(error.message || "Failed to sign out");
      setSignOutLoading(false);
    }
  };

  if (profileLoading || signOutLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8 pt-6">
      <main className="max-w-4xl mx-auto px-4 py-4">
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
                    {profile.role === "admin" && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    )}
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
                  {profile.role === "admin" && (
                    <Link href="/admin">
                      <button className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-3 rounded-button transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-premium cursor-pointer">
                        <Shield className="h-4 w-4" /> Admin Panel <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Notifications Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-4 md:col-span-2 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-primary" /> Notifications
              </h2>
              <Link href="/notifications" className="text-xs font-extrabold text-primary hover:text-primary-dark transition-colors duration-150">
                View All
              </Link>
            </div>
            <div 
              onClick={() => router.push("/notifications")}
              className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-150 cursor-pointer"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-slate-800">Notification History</p>
                <p className="text-[11px] font-semibold text-slate-500">View updates on your orders and promotions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </motion.div>

          {/* Saved Addresses */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-primary" /> Saved Addresses
              </h2>
              <Link href="/profile/addresses" className="text-xs font-extrabold text-primary hover:text-primary-dark transition-colors duration-150">
                Manage
              </Link>
            </div>

            {addresses.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs font-bold text-slate-400">No saved addresses found</p>
                <Link href="/profile/addresses">
                  <button className="text-xs text-primary font-extrabold hover:underline">
                    Add Address
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-150"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-extrabold text-slate-900">{address.name}</span>
                      {address.is_default && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                      <span className="font-extrabold text-slate-700">{address.building_name}</span>
                      <br />
                      {address.complete_address}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-4.5 w-4.5 text-primary" /> Recent Orders
              </h2>
              <Link href="/orders" className="text-xs font-extrabold text-primary hover:text-primary-dark transition-colors duration-150">
                View All
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs font-bold text-slate-400">You haven&apos;t placed any orders yet</p>
                <Link href="/">
                  <button className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-4 py-2 rounded-button shadow-premium transition-all duration-150">
                    Start Shopping
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link href="/orders" key={order.id} className="block">
                    <div className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          ID: #{order.id.slice(0, 8)}
                        </span>
                        <p className="text-xs font-extrabold text-slate-800">
                          ₹{order.total || order.total_amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                          order.status === "delivered"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : order.status === "cancelled"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {order.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {profile?.role === "admin" ? (
        /* Mobile Admin Footer Nav - Mobile Only */
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-100 py-2.5 px-4 shadow-lg md:hidden flex justify-between items-center rounded-t-xl">
          {[
            { label: "Dashboard", href: "/admin?tab=dashboard", icon: LayoutDashboard },
            { label: "Products", href: "/admin?tab=products", icon: ShoppingBasket },
            { label: "Orders", href: "/admin?tab=orders", icon: ShoppingCart },
            { label: "Coupons", href: "/admin?tab=coupons", icon: Tag },
            { label: "Profile", href: "/profile", icon: UserIcon, isSelected: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = tab.isSelected;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex flex-col items-center relative gap-0.5 flex-1 cursor-pointer focus:outline-none"
              >
                <div
                  className={`p-1 rounded-full transition-all duration-200 ${
                    isSelected ? "text-primary scale-110" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-[9px] font-bold ${
                    isSelected ? "text-primary font-extrabold" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <FooterNav />
      )}
    </div>
  );
}
