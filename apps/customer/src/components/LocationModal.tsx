"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, AlertCircle, Home, Briefcase, Map, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { createClient } from "@/lib/supabase/client";
import MapPicker from "./MapPicker";

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

export default function LocationModal() {
  const { location, showLocationModal, setShowLocationModal, setSavedLocation } = useLocation();
  const [tempLat, setTempLat] = useState<number>(STORE_LAT);
  const [tempLon, setTempLon] = useState<number>(STORE_LON);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [distance, setDistance] = useState<number>(0);

  // Address selection states
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Sync temp coordinates with current location when modal opens
  useEffect(() => {
    if (showLocationModal) {
      const activeLat = location?.lat || STORE_LAT;
      const activeLon = location?.lon || STORE_LON;
      setTempLat(activeLat);
      setTempLon(activeLon);
      setTempAddress(location?.address || "Veggies Shop, Malleshwaram");
      setDistance(getDistanceInKm(STORE_LAT, STORE_LON, activeLat, activeLon));

      // Fetch saved addresses from Supabase database
      const fetchAddresses = async () => {
        try {
          setLoadingAddresses(true);
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data, error } = await supabase
              .from("addresses")
              .select("*")
              .eq("profile_id", user.id)
              .order("is_default", { ascending: false });

            if (!error && data && data.length > 0) {
              setSavedAddresses(data);
              setViewMode("list");
            } else {
              setSavedAddresses([]);
              setViewMode("map");
            }
          } else {
            setSavedAddresses([]);
            setViewMode("map");
          }
        } catch (err) {
          console.error("Failed to load saved addresses for modal:", err);
          setViewMode("map");
        } finally {
          setLoadingAddresses(false);
        }
      };

      fetchAddresses();
    }
  }, [showLocationModal, location]);

  if (!showLocationModal) return null;

  const handleMapChange = (newLat: number, newLon: number, address?: string) => {
    setTempLat(newLat);
    setTempLon(newLon);
    if (address) {
      setTempAddress(address);
    }
    const dist = getDistanceInKm(STORE_LAT, STORE_LON, newLat, newLon);
    setDistance(dist);
  };

  const isTempServiceable = distance <= 2.0;
  const canClose = !!location;

  const handleConfirm = () => {
    if (isTempServiceable) {
      setSavedLocation(tempLat, tempLon, tempAddress || `${tempLat.toFixed(6)}, ${tempLon.toFixed(6)}`);
    }
  };

  const selectSavedAddress = (addr: any) => {
    const fullAddr = `${addr.building_name}, ${addr.complete_address}`;
    setSavedLocation(
      parseFloat(addr.latitude),
      parseFloat(addr.longitude),
      fullAddr,
      addr.id,
      addr.building_name,
      addr.complete_address
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-full">
              <MapPin className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {viewMode === "list" ? "Select Delivery Address" : "Set Delivery Location"}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                {viewMode === "list" ? "Choose from your saved locations" : "We deliver in 10 minutes to your doorstep"}
              </p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={() => setShowLocationModal(false)}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[70vh]">
          {loadingAddresses ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs font-bold text-slate-400">Loading your addresses...</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => selectSavedAddress(addr)}
                    className="p-3.5 bg-slate-50/60 hover:bg-slate-50 hover:border-primary/20 border border-slate-100 rounded-xl transition-all duration-150 cursor-pointer flex gap-3 items-start group text-left"
                  >
                    <div className={`p-2 rounded-xl ${
                      addr.name === "Home" ? "bg-emerald-50 text-emerald-600" :
                      addr.name === "Work" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    }`}>
                      {addr.name === "Home" ? <Home className="h-4.5 w-4.5" /> :
                       addr.name === "Work" ? <Briefcase className="h-4.5 w-4.5" /> : <MapPin className="h-4.5 w-4.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-800 group-hover:text-primary transition-colors">
                          {addr.name}
                        </span>
                        {addr.is_default && (
                          <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded border border-primary/20">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 leading-normal mt-1.5">
                        <span className="font-extrabold text-slate-700">{addr.building_name}</span>
                        <br />
                        {addr.complete_address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setViewMode("map")}
                className="w-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 font-extrabold text-xs py-3.5 rounded-button flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-sm"
              >
                <Map className="h-4 w-4" /> Pin New Address on Map
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="text-slate-500 hover:text-slate-700 font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer mb-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Saved Addresses
                </button>
              )}

              <MapPicker lat={tempLat} lon={tempLon} onChange={handleMapChange} />

              {/* Serviceability Banner */}
              {distance > 0 && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold leading-relaxed flex gap-2.5 items-start transition-colors duration-150 ${
                  isTempServiceable 
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                    : "bg-red-50/50 border-red-100 text-red-800"
                }`}>
                  {isTempServiceable ? (
                    <>
                      <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-emerald-900">Serviceable Location (approx. {distance.toFixed(2)} KM away)</p>
                        <p className="text-[10px] text-emerald-700/80 leading-snug">Veggies 10-minute delivery is available for this location.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-red-900">Out of Serviceable Area ({distance.toFixed(2)} KM away)</p>
                        <p className="text-[10px] text-red-700/80 leading-snug">We currently only deliver within our delivery range. Please pick a location closer to Malleshwaram.</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - only shown in map view for location confirmation */}
        {viewMode === "map" && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleConfirm}
              disabled={!isTempServiceable}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-sm py-3 px-5 rounded-button shadow-premium transition-all duration-150 text-center cursor-pointer"
            >
              Confirm Location & View Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
