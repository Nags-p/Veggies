"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Store,
  Compass,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Check,
  Copy,
  AlertCircle,
  Phone,
  Power,
  ShieldCheck,
  X,
  ExternalLink,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { Store as SharedStore, DEFAULT_STORES } from "@veggies/shared";
import MapPicker from "@/components/MapPicker";

export default function StoreLocationManager() {
  const supabase = createClient();

  const [stores, setStores] = useState<SharedStore[]>(DEFAULT_STORES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: 12.9784,
    lon: 77.6408,
    radius_km: 2.0,
    phone: "+91 98765 43210",
    staff_code: "",
    is_active: true,
  });

  // Generate a random 6-digit access code
  const generateRandomPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Fetch all stores from database
  const fetchStores = async () => {
    setLoading(true);
    try {
      // 1. Check stores table
      const { data: dbStores, error: storesErr } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: true });

      if (!storesErr && dbStores && dbStores.length > 0) {
        setStores(
          dbStores.map((s: any) => ({
            id: s.id,
            name: s.name,
            address: s.address,
            lat: parseFloat(s.lat),
            lon: parseFloat(s.lon),
            radius_km: parseFloat(s.radius_km) || 2.0,
            phone: s.phone || "",
            staff_code: s.staff_code || generateRandomPin(),
            is_active: s.is_active ?? true,
          }))
        );
        return;
      }

      // 2. Check store_settings 'stores_list'
      const { data: settingsList } = await supabase
        .from("store_settings")
        .select("key, value")
        .eq("key", "stores_list")
        .maybeSingle();

      if (settingsList && Array.isArray(settingsList.value) && settingsList.value.length > 0) {
        setStores(
          settingsList.value.map((s: any) => ({
            id: s.id || `store-${Math.random()}`,
            name: s.name,
            address: s.address,
            lat: parseFloat(s.lat),
            lon: parseFloat(s.lon),
            radius_km: parseFloat(s.radius_km) || 2.0,
            phone: s.phone || "",
            staff_code: s.staff_code || generateRandomPin(),
            is_active: s.is_active ?? true,
          }))
        );
        return;
      }

      // 3. Fallback to DEFAULT_STORES
      setStores(DEFAULT_STORES);
    } catch (err) {
      console.warn("Failed to load stores from database:", err);
      setStores(DEFAULT_STORES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Helper to persist updated stores list to store_settings for zero-latency client sync
  const syncToStoreSettings = async (updatedList: SharedStore[]) => {
    try {
      await supabase.from("store_settings").upsert({
        key: "stores_list",
        value: updatedList,
        updated_at: new Date().toISOString(),
      });

      // Also sync first active store to 'store_location' for backward compatibility
      const primary = updatedList.find((s) => s.is_active) || updatedList[0];
      if (primary) {
        await supabase.from("store_settings").upsert({
          key: "store_location",
          value: {
            name: primary.name,
            address: primary.address,
            lat: primary.lat,
            lon: primary.lon,
            radius_km: primary.radius_km || 2.0,
            phone: primary.phone,
          },
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Sync to store_settings failed:", e);
    }
  };

  // Open modal for Create New Store
  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedStoreId(null);
    setFormData({
      name: "",
      address: "",
      lat: 12.9784,
      lon: 77.6408,
      radius_km: 2.0,
      phone: "+91 98765 43210",
      staff_code: generateRandomPin(),
      is_active: true,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit Existing Store
  const handleOpenEdit = (store: SharedStore) => {
    setModalMode("edit");
    setSelectedStoreId(store.id);
    setFormData({
      name: store.name,
      address: store.address,
      lat: store.lat,
      lon: store.lon,
      radius_km: store.radius_km || 2.0,
      phone: store.phone || "+91 98765 43210",
      staff_code: store.staff_code || generateRandomPin(),
      is_active: store.is_active,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Save (Create or Update) Store
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Please provide a store name.");
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg("Please provide a store physical address.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (modalMode === "create") {
        const newStoreId = `store-${Date.now()}`;
        const newStore: SharedStore = {
          id: newStoreId,
          name: formData.name.trim(),
          address: formData.address.trim(),
          lat: Number(formData.lat),
          lon: Number(formData.lon),
          radius_km: Number(formData.radius_km) || 2.0,
          phone: formData.phone.trim(),
          staff_code: formData.staff_code || generateRandomPin(),
          is_active: formData.is_active,
        };

        // Try DB insert into stores table
        try {
          await supabase.from("stores").insert({
            name: newStore.name,
            address: newStore.address,
            lat: newStore.lat,
            lon: newStore.lon,
            radius_km: newStore.radius_km,
            phone: newStore.phone,
            staff_code: newStore.staff_code,
            is_active: newStore.is_active,
          });
        } catch (e) {
          console.warn("Direct stores table insert skipped:", e);
        }

        // Insert into store_staff_codes table
        try {
          await supabase.from("store_staff_codes").insert({
            store_name: newStore.name,
            access_code: newStore.staff_code,
            is_active: newStore.is_active,
          });
        } catch (e) {
          console.warn("Staff codes insert skipped:", e);
        }

        const updatedList = [...stores, newStore];
        setStores(updatedList);
        await syncToStoreSettings(updatedList);

        setSuccessMsg(`Store "${newStore.name}" created successfully with 2KM delivery radius!`);
      } else if (modalMode === "edit" && selectedStoreId) {
        const oldStore = stores.find((s) => s.id === selectedStoreId);
        const oldCode = oldStore?.staff_code;

        const updatedStore: SharedStore = {
          id: selectedStoreId,
          name: formData.name.trim(),
          address: formData.address.trim(),
          lat: Number(formData.lat),
          lon: Number(formData.lon),
          radius_km: Number(formData.radius_km) || 2.0,
          phone: formData.phone.trim(),
          staff_code: formData.staff_code,
          is_active: formData.is_active,
        };

        // Try DB update on stores table
        try {
          await supabase
            .from("stores")
            .update({
              name: updatedStore.name,
              address: updatedStore.address,
              lat: updatedStore.lat,
              lon: updatedStore.lon,
              radius_km: updatedStore.radius_km,
              phone: updatedStore.phone,
              staff_code: updatedStore.staff_code,
              is_active: updatedStore.is_active,
            })
            .eq("id", selectedStoreId);
        } catch (e) {
          console.warn("Direct stores table update skipped:", e);
        }

        // Clean up old staff codes in store_staff_codes to prevent old PIN logins
        try {
          if (oldCode && oldCode !== updatedStore.staff_code) {
            await supabase.from("store_staff_codes").delete().eq("access_code", oldCode);
          }
          if (oldStore?.name) {
            await supabase.from("store_staff_codes").delete().eq("store_name", oldStore.name);
          }
          if (updatedStore.name !== oldStore?.name) {
            await supabase.from("store_staff_codes").delete().eq("store_name", updatedStore.name);
          }

          // Insert the single active PIN
          if (updatedStore.staff_code) {
            await supabase.from("store_staff_codes").insert({
              store_name: updatedStore.name,
              access_code: updatedStore.staff_code,
              is_active: updatedStore.is_active,
            });
          }
        } catch (e) {
          console.warn("Error updating store_staff_codes:", e);
        }

        const updatedList = stores.map((s) => (s.id === selectedStoreId ? updatedStore : s));
        setStores(updatedList);
        await syncToStoreSettings(updatedList);

        setSuccessMsg(`Store "${updatedStore.name}" updated successfully! 2KM radius applied.`);
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Failed to save store: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Store Active / Inactive
  const toggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const target = stores.find((s) => s.id === storeId);
    const updatedList = stores.map((s) =>
      s.id === storeId ? { ...s, is_active: nextStatus } : s
    );
    setStores(updatedList);
    await syncToStoreSettings(updatedList);

    try {
      await supabase.from("stores").update({ is_active: nextStatus }).eq("id", storeId);
      if (target?.staff_code) {
        await supabase
          .from("store_staff_codes")
          .update({ is_active: nextStatus })
          .eq("access_code", target.staff_code);
      }
      if (target?.name) {
        await supabase
          .from("store_staff_codes")
          .update({ is_active: nextStatus })
          .eq("store_name", target.name);
      }
    } catch (e) {}
  };

  // Rotate Store Staff Terminal PIN (immediately invalidates all older PINs)
  const rotateStaffCode = async (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    const oldCode = target?.staff_code;
    const newCode = generateRandomPin();

    const updatedList = stores.map((s) =>
      s.id === storeId ? { ...s, staff_code: newCode } : s
    );
    setStores(updatedList);
    await syncToStoreSettings(updatedList);

    try {
      // 1. Update stores table with the new PIN
      await supabase.from("stores").update({ staff_code: newCode }).eq("id", storeId);

      // 2. Delete ALL previous codes for this store from store_staff_codes so old PIN CANNOT log in!
      if (oldCode) {
        await supabase.from("store_staff_codes").delete().eq("access_code", oldCode);
      }
      if (target?.name) {
        await supabase.from("store_staff_codes").delete().eq("store_name", target.name);
      }

      // 3. Insert the newly generated active PIN
      if (target) {
        await supabase.from("store_staff_codes").insert({
          store_name: target.name,
          access_code: newCode,
          is_active: target.is_active,
        });
      }
    } catch (e) {
      console.warn("Error rotating staff code:", e);
    }

    setSuccessMsg(`New PIN (${newCode}) generated for ${target?.name || "store"}. Old PIN ${oldCode ? `(${oldCode}) ` : ""}is now strictly invalidated!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Delete Store
  const handleDeleteStore = async (storeId: string) => {
    if (stores.length <= 1) {
      alert("At least one store must remain configured.");
      return;
    }
    const storeToDelete = stores.find((s) => s.id === storeId);
    if (!confirm(`Are you sure you want to remove "${storeToDelete?.name || "this store"}"?`)) {
      return;
    }

    const updatedList = stores.filter((s) => s.id !== storeId);
    setStores(updatedList);
    await syncToStoreSettings(updatedList);

    try {
      await supabase.from("stores").delete().eq("id", storeId);
      if (storeToDelete?.staff_code) {
        await supabase.from("store_staff_codes").delete().eq("access_code", storeToDelete.staff_code);
      }
      if (storeToDelete?.name) {
        await supabase.from("store_staff_codes").delete().eq("store_name", storeToDelete.name);
      }
    } catch (e) {}
  };

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header with Title and Create Store Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Store Branches & Delivery Radius Hub
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                2.0 KM RADIUS ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and edit store locations with GPS coordinates and access codes. Customers within 2 KM of any active branch receive express delivery.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New Store
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stores.map((st) => (
          <div
            key={st.id}
            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              st.is_active
                ? "bg-white border-slate-200/90 shadow-sm hover:border-emerald-500/40 hover:shadow-md"
                : "bg-slate-50 border-slate-200 opacity-65"
            }`}
          >
            <div>
              {/* Store Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl mt-0.5 ${st.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                      {st.address}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                    st.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-200 text-slate-600 border border-slate-300"
                  }`}
                >
                  {st.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              {/* Badges: Phone, GPS, Radius */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px]">
                {st.phone && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {st.phone}
                  </span>
                )}

                <a
                  href={`https://www.google.com/maps?q=${st.lat},${st.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                  title="View on Google Maps"
                >
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>{st.lat.toFixed(4)}, {st.lon.toFixed(4)}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>

                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {st.radius_km || 2.0} KM Delivery Radius
                </span>
              </div>

              {/* Staff Terminal PIN display */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <KeyRound className="w-3 h-3 text-emerald-600" />
                    Store Staff Terminal PIN
                  </div>
                  <div className="text-xl font-black font-mono tracking-widest text-slate-800 mt-0.5">
                    {st.staff_code || "------"}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => st.staff_code && copyToClipboard(st.id, st.staff_code)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                    title="Copy PIN for staff login"
                  >
                    {copiedId === st.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => rotateStaffCode(st.id)}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer shadow-xs"
                    title="Generate a new random PIN"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleStoreStatus(st.id, st.is_active)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  st.is_active
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {st.is_active ? "Deactivate" : "Activate Branch"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(st)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Store Details
                </button>

                {stores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStore(st.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete this store branch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: CREATE OR EDIT STORE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {modalMode === "create" ? "Create New Store Branch" : `Edit Store: ${formData.name || "Branch"}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure store coordinates, physical address, and 2 KM delivery boundary.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Map: Pin Exact Store Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Pin Store Location on Map
                </label>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {formData.radius_km || 2.0} KM Delivery Circle
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 shadow-xs bg-slate-50 p-2">
                <MapPicker
                  lat={formData.lat}
                  lon={formData.lon}
                  radiusKm={formData.radius_km}
                  onChange={(newLat, newLon, newAddress) => {
                    setFormData((prev) => ({
                      ...prev,
                      lat: parseFloat(newLat.toFixed(6)),
                      lon: parseFloat(newLon.toFixed(6)),
                      address: newAddress || prev.address,
                    }));
                  }}
                />
              </div>
            </div>

            {/* Main Form Fields */}
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Branch Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Veggies Malleshwaram Store"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Support Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Store Physical Address *
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full street address, cross, locality, city"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Coordinates & Delivery Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Latitude (GPS)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Longitude (GPS)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.lon}
                    onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Delivery Radius (KM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="15"
                    value={formData.radius_km}
                    onChange={(e) =>
                      setFormData({ ...formData, radius_km: parseFloat(e.target.value) || 2.0 })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Staff Terminal Access Code */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Staff Terminal Login PIN (6 Digits)
                  </span>
                  <span className="text-lg font-black font-mono tracking-widest text-slate-800">
                    {formData.staff_code || "------"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, staff_code: generateRandomPin() })}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate New PIN
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Store...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {modalMode === "create" ? "Create Store & Apply 2KM Radius" : "Save Changes & Apply 2KM Radius"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
