"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Edit, Trash2, Check, ArrowLeft, Loader2, Home, Briefcase, Map, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocation } from "@/context/LocationContext";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import MapPicker from "@/components/MapPicker";

interface Address {
  id: string;
  name: string;
  building_name: string;
  complete_address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

const STORE_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "13.0017689");
const STORE_LON = parseFloat(process.env.NEXT_PUBLIC_STORE_LON || "77.5777957");

// Haversine formula to compute distance in KM
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AddressManager() {
  const router = useRouter();
  const supabase = createClient();
  const { setSavedLocation } = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  
  // Form view toggle
  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields State
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");

  const [lat, setLat] = useState<number>(STORE_LAT);
  const [lon, setLon] = useState<number>(STORE_LON);
  const [isDefault, setIsDefault] = useState(false);
  
  const [distance, setDistance] = useState(0);

  // Check auth and load addresses
  const loadAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/profile/addresses");
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("profile_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAddresses(data);
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [router, supabase]);

  // Handle Map Pin movement
  const handleMapChange = (
    newLat: number,
    newLon: number,
    addressText?: string,
    details?: { postalCode?: string; city?: string; state?: string }
  ) => {
    setLat(newLat);
    setLon(newLon);
    if (addressText) {
      setAddressLine2(addressText);
    }

    const dist = getDistanceInKm(STORE_LAT, STORE_LON, newLat, newLon);
    setDistance(dist);
  };

  // Attempt to geolocate customer device
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLon = position.coords.longitude;
          setLat(currentLat);
          setLon(currentLon);
          const dist = getDistanceInKm(STORE_LAT, STORE_LON, currentLat, currentLon);
          setDistance(dist);
        },
        (error) => {
          console.error("Geolocation failed:", error);
          alert("Could not access your location. Please pin it manually on the map.");
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addressId: string) => {
    if (!userId) return;
    try {
      // 1. Reset all to false
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("profile_id", userId);
      
      // 2. Set target to true
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId);

      // 3. Update global header context
      const target = addresses.find((a) => a.id === addressId);
      if (target) {
        const fullAddr = `${target.building_name}, ${target.complete_address}`;
        setSavedLocation(target.latitude, target.longitude, fullAddr);
      }

      await loadAddresses();
    } catch (err) {
      console.error("Failed to set default address:", err);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", addressId);
      if (error) {
        console.error("Failed to delete address:", error);
        alert(`Failed to delete address: ${error.message}\nDetail: ${error.details || "None"}`);
      } else {
        await loadAddresses();
      }
    } catch (err: any) {
      console.error("Failed to delete address:", err);
      alert(`An error occurred: ${err.message || err}`);
    }
  };

  // Handle Edit click
  const handleEditClick = (address: Address) => {
    setEditingAddressId(address.id);
    setAddressLabel(address.name);
    setAddressLine1(address.building_name);
    setAddressLine2(address.complete_address);
    setLat(address.latitude);
    setLon(address.longitude);
    setIsDefault(address.is_default);

    const dist = getDistanceInKm(STORE_LAT, STORE_LON, address.latitude, address.longitude);
    setDistance(dist);

    setShowForm(true);
  };

  // Create new or update address submit
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!addressLine1.trim()) {
      alert("Please enter Building Name / Floor / House No.");
      return;
    }
    if (!addressLine2.trim()) {
      alert("Please select a location on the map first.");
      return;
    }

    try {
      setSaving(true);

      // If set to default, reset other addresses first
      if (isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("profile_id", userId);
      }

      // If this is the only address, force default
      const willBeDefault = addresses.length === 0 ? true : isDefault;

      if (editingAddressId) {
        // Update existing address
        const { error } = await supabase
          .from("addresses")
          .update({
            name: addressLabel,
            building_name: addressLine1,
            complete_address: addressLine2,
            latitude: lat,
            longitude: lon,
            is_default: willBeDefault
          })
          .eq("id", editingAddressId);

        if (error) throw error;
      } else {
        // Insert new address
        const { error } = await supabase.from("addresses").insert({
          profile_id: userId,
          name: addressLabel,
          building_name: addressLine1,
          complete_address: addressLine2,
          latitude: lat,
          longitude: lon,
          is_default: willBeDefault
        });

        if (error) throw error;
      }

      // Update global header context if it became the default address
      if (willBeDefault) {
        const fullAddr = `${addressLine1}, ${addressLine2}`;
        setSavedLocation(lat, lon, fullAddr);
      }

      // Reset form
      setAddressLabel("Home");
      setAddressLine1("");
      setAddressLine2("");
      setIsDefault(false);
      setLat(STORE_LAT);
      setLon(STORE_LON);
      setEditingAddressId(null);
      setShowForm(false);
      
      await loadAddresses();
    } catch (err) {
      console.error("Failed to save address:", err);
      alert("Error saving address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading addresses...</p>
      </div>
    );
  }

  const isWithinServiceArea = distance <= 2.0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-12">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Back navigation header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingAddressId(null);
              } else {
                router.push("/profile");
              }
            }}
            className="p-2 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">
              {showForm ? (editingAddressId ? "Edit Delivery Address" : "Add Delivery Address") : "Manage Saved Addresses"}
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-none">
              {showForm ? "Pin your location and enter address details" : "Your saved locations for express delivery"}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div
              key="address-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Address Loop */}
              {addresses.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl shadow-card border border-slate-100/80 space-y-3.5">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">No saved addresses found</p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      handleLocateMe();
                    }}
                    className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-4 py-2.5 rounded-button shadow-premium transition-all duration-150 cursor-pointer"
                  >
                    Add Your First Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`bg-white p-4.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3 shadow-card ${
                        address.is_default ? "border-primary/20 bg-primary/[0.01]" : "border-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-2.5 items-start">
                          <div className={`p-2 rounded-xl mt-0.5 ${
                            address.name === "Home" ? "bg-emerald-50 text-emerald-600" :
                            address.name === "Work" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          }`}>
                            {address.name === "Home" ? <Home className="h-4 w-4" /> :
                             address.name === "Work" ? <Briefcase className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">{address.name}</span>
                              {address.is_default && (
                                <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1.5">
                              <span className="font-extrabold text-slate-800">{address.building_name}</span>
                              <br />
                              {address.complete_address}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick(address)}
                            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 font-bold text-[10px] py-1.5 rounded-lg transition-all text-center cursor-pointer uppercase tracking-wider"
                        >
                          Set as Default Address
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setShowForm(true);
                      handleLocateMe();
                    }}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold text-xs py-3.5 rounded-button shadow-premium flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add New Address
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="address-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSaveAddress}
              className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-5 space-y-4"
            >
              {/* Interactive map */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    1. Pin Your Delivery Point
                  </span>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="text-[10px] text-primary font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Compass className="h-3.5 w-3.5" /> Use Current Location
                  </button>
                </div>
                <div className="h-60 rounded-xl overflow-hidden border border-slate-100">
                  <MapPicker lat={lat} lon={lon} onChange={handleMapChange} />
                </div>
              </div>

              {/* Service area check */}
              {distance > 0 && (
                <div className={`p-3.5 rounded-2xl border text-[11px] font-semibold text-left space-y-1 ${
                  isWithinServiceArea 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-805" 
                    : "bg-rose-50 border-rose-100 text-rose-805"
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isWithinServiceArea ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    <span className="font-extrabold uppercase tracking-wide text-[9px]">
                      {isWithinServiceArea ? "Serviceable Area" : "Unserviceable Area"}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {isWithinServiceArea 
                      ? `This location is approx. ${distance.toFixed(2)} KM from our store. Delivery is active!` 
                      : `This location is ${distance.toFixed(2)} KM from our store. We only deliver within 2.0 KM of Malleshwaram.`
                    }
                  </p>
                </div>
              )}

              {/* Address label selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  2. Select Address Label
                </span>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setAddressLabel(label)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        addressLabel === label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label === "Home" && <Home className="h-3.5 w-3.5" />}
                      {label === "Work" && <Briefcase className="h-3.5 w-3.5" />}
                      {label === "Other" && <MapPin className="h-3.5 w-3.5" />}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Building Name / Floor / House No.*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 405, 4th Floor"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Complete Address & Pincode*
                  </label>
                  <textarea
                    readOnly
                    disabled
                    value={addressLine2}
                    placeholder="Please pin your location on the map above to select the address"
                    className="w-full bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed resize-none"
                    rows={3}
                  />
                </div>

                <label className="flex items-center gap-2.5 pt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded text-primary border-slate-200 focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-600 select-none">
                    Set as Default Delivery Address
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAddressId(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isWithinServiceArea}
                  className="flex-1 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-extrabold text-xs py-3 rounded-button shadow-premium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{saving ? "Saving..." : (editingAddressId ? "Save Changes" : "Save Address")}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>

      <FooterNav />
    </div>
  );
}
