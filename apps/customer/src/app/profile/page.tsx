"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User as UserIcon, Mail, Phone, Shield, MapPin, ShoppingBag, LogOut, ChevronRight, Loader2, ArrowRight, LayoutDashboard, ShoppingBasket, ShoppingCart, Tag, Bell, Settings, Camera, Heart } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50/50 pb-24 pt-4">
      <main className="max-w-md mx-auto px-4 space-y-6">
        
        {/* Screen Header Title */}
        <div className="flex items-center justify-between py-1">
          <h1 className="text-xl font-black text-slate-900">Profile</h1>
          <div className="p-2 bg-white rounded-full border border-slate-100 shadow-sm">
            <Settings className="h-4.5 w-4.5 text-slate-500" />
          </div>
        </div>

        {/* User Profile Header Card */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {isEditing ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm w-full space-y-4 text-left">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Edit Profile Details</h2>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">Full Name*</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-widest block">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-455 uppercase tracking-widest block">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all text-slate-800"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-500 font-extrabold text-[10px] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-extrabold text-[10px] rounded-xl shadow-sm transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 w-full text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      {profile.full_name}
                    </h2>
                    {profile.role === "admin" && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary/10 text-primary border border-primary/20">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    {profile.phone || "No phone added"} &nbsp;•&nbsp; {profile.email || "No email added"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditName(profile.full_name);
                    setEditPhone(profile.phone || "");
                    setEditEmail(profile.email || "");
                    setIsEditing(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-[10px] font-black text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all border border-primary/10 cursor-pointer flex-shrink-0"
                >
                  EDIT
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Section 1: My Account */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 tracking-wider uppercase px-1 text-left">My Account</h3>
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden divide-y divide-slate-100 text-left">
            {/* Saved Addresses */}
            <div 
              onClick={() => router.push("/profile/addresses")}
              className="flex items-center justify-between p-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">Manage Addresses</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Share, edit, and add new delivery addresses</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Order History */}
            <div 
              onClick={() => router.push("/orders")}
              className="flex items-center justify-between p-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <ShoppingBag className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">Your Orders</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">View past orders and track current ones</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Wishlist */}
            <div 
              onClick={() => router.push("/wishlist")}
              className="flex items-center justify-between p-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <Heart className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">Your Wishlist</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">View and buy your saved favorite products</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Section 2: Offers & Alerts */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 tracking-wider uppercase px-1 text-left">Offers & Alerts</h3>
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden divide-y divide-slate-100 text-left">
            {/* Notifications */}
            <div 
              onClick={() => router.push("/notifications")}
              className="flex items-center justify-between p-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <Bell className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">Notifications</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">View updates on your orders and promotions</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Section 3: App Actions */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 tracking-wider uppercase px-1 text-left">Settings</h3>
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden divide-y divide-slate-100 text-left">
            {profile && profile.role === "admin" && (
              <Link href="/admin" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3.5">
                    <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800">Admin Dashboard Panel</p>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Manage store products, orders, and stats</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            )}

            {/* Sign Out */}
            <div 
              onClick={handleSignOut}
              className="flex items-center justify-between p-4 hover:bg-red-50/20 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <LogOut className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-800">Sign Out</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Log out of your current account session</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Version footer */}
        <div className="text-center pt-2">
          <span className="text-[9px] font-bold text-slate-350 tracking-wider uppercase">
            Veggies App v1.0.1
          </span>
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
