"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface LocationData {
  lat: number;
  lon: number;
  address: string;
  id?: string;
  building_name?: string;
  complete_address?: string;
}

interface LocationContextType {
  location: LocationData | null;
  isServiceable: boolean;
  loadingLocation: boolean;
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
  setSavedLocation: (
    lat: number,
    lon: number,
    address: string,
    id?: string,
    building_name?: string,
    complete_address?: string
  ) => void;
  detectLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORE_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "13.0017689");
const STORE_LON = parseFloat(process.env.NEXT_PUBLIC_STORE_LON || "77.5777957");

const DEFAULT_LOCATION: LocationData = {
  lat: STORE_LAT,
  lon: STORE_LON,
  address: "Malleshwaram, Bengaluru"
};

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

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(DEFAULT_LOCATION);
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  const checkServiceable = (lat: number, lon: number): boolean => {
    const distance = getDistanceInKm(STORE_LAT, STORE_LON, lat, lon);
    return distance <= 2.0; // 2 KM serviceable radius
  };

  const updateLocation = (
    lat: number,
    lon: number,
    address: string,
    id?: string,
    building_name?: string,
    complete_address?: string
  ) => {
    const serviceable = checkServiceable(lat, lon);
    const newLoc = { lat, lon, address, id, building_name, complete_address };
    setLocation(newLoc);
    setIsServiceable(serviceable);
    localStorage.setItem("veggies_location", JSON.stringify(newLoc));
  };

  const setSavedLocation = (
    lat: number,
    lon: number,
    address: string,
    id?: string,
    building_name?: string,
    complete_address?: string
  ) => {
    updateLocation(lat, lon, address, id, building_name, complete_address);
    setShowLocationModal(false);
  };

  const detectLocationBackground = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        let address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (err) {
          console.error("Reverse geocoding failed on detectLocationBackground:", err);
        }

        updateLocation(lat, lon, address);
      },
      (error) => {
        console.warn("Background geolocation error:", error);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLoadingLocation(false);
      setShowLocationModal(true);
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        let address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (err) {
          console.error("Reverse geocoding failed on detectLocation:", err);
        }

        updateLocation(lat, lon, address);
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error on detectLocation:", error);
        setLoadingLocation(false);
        // If detection fails and no location is saved, force show the modal picker
        const saved = localStorage.getItem("veggies_location");
        if (!saved) {
          setShowLocationModal(true);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Request startup permissions for notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch((err) => {
          console.error("Error requesting notification permission:", err);
        });
      }
    }
  }, []);

  // Restore or check location on startup and auth changes
  useEffect(() => {
    const supabase = createClient();
    
    async function syncDefaultAddress() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fall back to local storage if not logged in
        const saved = localStorage.getItem("veggies_location");
        if (saved) {
          try {
            const data: LocationData = JSON.parse(saved);
            const serviceable = checkServiceable(data.lat, data.lon);
            setLocation(data);
            setIsServiceable(serviceable);
            setLoadingLocation(false);
            return;
          } catch (e) {
            console.error("Failed to parse saved location:", e);
          }
        }
        setLocation(DEFAULT_LOCATION);
        setIsServiceable(true);
        setLoadingLocation(false);
        detectLocationBackground();
        return;
      }

      // Check if user has a default saved address in database
      const { data: defaultAddr } = await supabase
        .from("addresses")
        .select("*")
        .eq("profile_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (defaultAddr) {
        const fullAddr = `${defaultAddr.building_name}, ${defaultAddr.complete_address}`;
        updateLocation(
          parseFloat(defaultAddr.latitude),
          parseFloat(defaultAddr.longitude),
          fullAddr,
          defaultAddr.id,
          defaultAddr.building_name,
          defaultAddr.complete_address
        );
        setLoadingLocation(false);
      } else {
        // Fall back to local storage or detect
        const saved = localStorage.getItem("veggies_location");
        if (saved) {
          try {
            const data: LocationData = JSON.parse(saved);
            const serviceable = checkServiceable(data.lat, data.lon);
            setLocation(data);
            setIsServiceable(serviceable);
            setLoadingLocation(false);
            return;
          } catch (e) {
            console.error("Failed to parse saved location:", e);
          }
        }
        setLocation(DEFAULT_LOCATION);
        setIsServiceable(true);
        setLoadingLocation(false);
        detectLocationBackground();
      }
    }

    syncDefaultAddress();

    // Listen for auth events to re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        syncDefaultAddress();
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("veggies_location");
        setLocation(DEFAULT_LOCATION);
        setIsServiceable(true);
        detectLocationBackground();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        isServiceable,
        loadingLocation,
        showLocationModal,
        setShowLocationModal,
        setSavedLocation,
        detectLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
