"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Store, DEFAULT_STORES, getNearestStore, getDistanceInKm } from "@veggies/shared";

export interface LocationData {
  lat: number;
  lon: number;
  address: string;
  id?: string;
  building_name?: string;
  complete_address?: string;
}

export interface StoreLocationData {
  id?: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  radius_km: number;
  phone?: string;
  is_active?: boolean;
}

export const DEFAULT_STORE_LOCATION: StoreLocationData = {
  id: "store-indiranagar",
  name: "Veggies Flagship Store (Indiranagar)",
  address: "12th Cross, Indiranagar, Bengaluru",
  lat: 12.9784,
  lon: 77.6408,
  radius_km: 2.0,
  phone: "+91 98765 43210",
};

interface LocationContextType {
  location: LocationData | null;
  storeLocation: StoreLocationData;
  stores: Store[];
  nearestStore: Store | null;
  isServiceable: boolean;
  loadingLocation: boolean;
  showLocationModal: boolean;
  distanceFromStore: number;
  getDistanceInKm: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
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
  refreshStoreLocation: () => Promise<void>;
  refreshStores: () => Promise<Store[]>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export { getDistanceInKm };


export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [nearestStore, setNearestStore] = useState<Store | null>(DEFAULT_STORES[0]);
  const [storeLocation, setStoreLocation] = useState<StoreLocationData>(DEFAULT_STORE_LOCATION);
  const [location, setLocation] = useState<LocationData | null>({
    lat: DEFAULT_STORE_LOCATION.lat,
    lon: DEFAULT_STORE_LOCATION.lon,
    address: DEFAULT_STORE_LOCATION.address,
  });
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [distanceFromStore, setDistanceFromStore] = useState<number>(0);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  const checkServiceable = (
    lat: number,
    lon: number,
    candidateStores?: Store[]
  ): { serviceable: boolean; dist: number; nearest: Store | null } => {
    const list = candidateStores && candidateStores.length > 0 ? candidateStores : stores;
    const result = getNearestStore(lat, lon, list);
    const closest = (result.store as Store) || list[0] || null;

    if (closest) {
      setNearestStore(closest);
      setStoreLocation({
        id: closest.id,
        name: closest.name,
        address: closest.address,
        lat: Number(closest.lat),
        lon: Number(closest.lon),
        radius_km: Number(closest.radius_km) || 2.0,
        phone: closest.phone,
        is_active: closest.is_active,
      });
    }

    return {
      serviceable: result.isDeliverable,
      dist: result.distance,
      nearest: closest,
    };
  };

  const updateLocation = (
    lat: number,
    lon: number,
    address: string,
    id?: string,
    building_name?: string,
    complete_address?: string,
    candidateStores?: Store[]
  ) => {
    const { serviceable, dist } = checkServiceable(lat, lon, candidateStores);
    const newLoc = { lat, lon, address, id, building_name, complete_address };
    setLocation(newLoc);
    setIsServiceable(serviceable);
    setDistanceFromStore(dist);
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

  const detectLocationBackground = (candidateStores?: Store[]) => {
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

        updateLocation(lat, lon, address, undefined, undefined, undefined, candidateStores);
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
        const saved = localStorage.getItem("veggies_location");
        if (!saved) {
          setShowLocationModal(true);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Fetch all active stores from database
  const fetchStores = async (): Promise<Store[]> => {
    const supabase = createClient();
    try {
      // 1. Try querying dedicated stores table
      const { data: dbStores, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: true });

      if (!storesError && dbStores && dbStores.length > 0) {
        const parsedStores: Store[] = dbStores.map((s: any) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          lat: parseFloat(s.lat),
          lon: parseFloat(s.lon),
          radius_km: parseFloat(s.radius_km) || 2.0,
          phone: s.phone,
          is_active: s.is_active ?? true,
          staff_code: s.staff_code,
        }));
        setStores(parsedStores);
        return parsedStores;
      }

      // 2. Fallback to store_settings 'stores_list'
      const { data: settingsList } = await supabase
        .from("store_settings")
        .select("key, value")
        .eq("key", "stores_list")
        .maybeSingle();

      if (settingsList && Array.isArray(settingsList.value) && settingsList.value.length > 0) {
        const parsedList: Store[] = settingsList.value.map((s: any) => ({
          id: s.id || `store-${Math.random()}`,
          name: s.name,
          address: s.address,
          lat: parseFloat(s.lat),
          lon: parseFloat(s.lon),
          radius_km: parseFloat(s.radius_km) || 2.0,
          phone: s.phone,
          is_active: s.is_active ?? true,
          staff_code: s.staff_code,
        }));
        setStores(parsedList);
        return parsedList;
      }

      // 3. Fallback to store_settings 'store_location'
      const { data: singleStore } = await supabase
        .from("store_settings")
        .select("key, value")
        .eq("key", "store_location")
        .maybeSingle();

      if (singleStore && singleStore.value) {
        const single: Store = {
          id: "primary-store",
          name: singleStore.value.name || DEFAULT_STORE_LOCATION.name,
          address: singleStore.value.address || DEFAULT_STORE_LOCATION.address,
          lat: parseFloat(singleStore.value.lat) || DEFAULT_STORE_LOCATION.lat,
          lon: parseFloat(singleStore.value.lon) || DEFAULT_STORE_LOCATION.lon,
          radius_km: parseFloat(singleStore.value.radius_km) || 2.0,
          phone: singleStore.value.phone || DEFAULT_STORE_LOCATION.phone,
          is_active: true,
        };
        setStores([single]);
        return [single];
      }
    } catch (err) {
      console.warn("Failed to fetch stores, falling back to default stores:", err);
    }

    setStores(DEFAULT_STORES);
    return DEFAULT_STORES;
  };

  const refreshStoreLocation = async () => {
    const list = await fetchStores();
    if (location) {
      checkServiceable(location.lat, location.lon, list);
    }
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

    async function initLocation() {
      // 1. Fetch current stores from database first
      const currentStores = await fetchStores();

      // 2. Check localStorage for user location
      const saved = localStorage.getItem("veggies_location");
      if (saved) {
        try {
          const data: LocationData = JSON.parse(saved);
          const { serviceable, dist, nearest } = checkServiceable(data.lat, data.lon, currentStores);
          setLocation(data);
          setIsServiceable(serviceable);
          setDistanceFromStore(dist);
          setLoadingLocation(false);
        } catch (e) {
          console.error("Failed to parse saved location:", e);
        }
      }

      // 3. Check if logged-in user has default address
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!saved) {
          const primaryStore = currentStores[0] || DEFAULT_STORE_LOCATION;
          const defaultLoc = {
            lat: primaryStore.lat,
            lon: primaryStore.lon,
            address: primaryStore.address,
          };
          setLocation(defaultLoc);
          setIsServiceable(true);
          setDistanceFromStore(0);
          setLoadingLocation(false);
          detectLocationBackground(currentStores);
        }
        return;
      }

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
          defaultAddr.complete_address,
          currentStores
        );
        setLoadingLocation(false);
      } else if (!saved) {
        const primaryStore = currentStores[0] || DEFAULT_STORE_LOCATION;
        const defaultLoc = {
          lat: primaryStore.lat,
          lon: primaryStore.lon,
          address: primaryStore.address,
        };
        setLocation(defaultLoc);
        setIsServiceable(true);
        setDistanceFromStore(0);
        setLoadingLocation(false);
        detectLocationBackground(currentStores);
      }
    }

    initLocation();

    // Subscribe to stores updates in realtime
    const storesChannel = supabase
      .channel("stores-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        () => {
          fetchStores().then((updatedList) => {
            const currentSaved = localStorage.getItem("veggies_location");
            if (currentSaved) {
              try {
                const parsed = JSON.parse(currentSaved);
                const { serviceable, dist } = checkServiceable(parsed.lat, parsed.lon, updatedList);
                setIsServiceable(serviceable);
                setDistanceFromStore(dist);
              } catch (e) {}
            }
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        () => {
          fetchStores().then((updatedList) => {
            const currentSaved = localStorage.getItem("veggies_location");
            if (currentSaved) {
              try {
                const parsed = JSON.parse(currentSaved);
                const { serviceable, dist } = checkServiceable(parsed.lat, parsed.lon, updatedList);
                setIsServiceable(serviceable);
                setDistanceFromStore(dist);
              } catch (e) {}
            }
          });
        }
      )
      .subscribe();

    // Listen for auth events to re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        initLocation();
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("veggies_location");
        setLocation({
          lat: DEFAULT_STORE_LOCATION.lat,
          lon: DEFAULT_STORE_LOCATION.lon,
          address: DEFAULT_STORE_LOCATION.address,
        });
        setIsServiceable(true);
        setDistanceFromStore(0);
        detectLocationBackground();
      }
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(storesChannel);
    };
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        storeLocation,
        stores,
        nearestStore,
        isServiceable,
        distanceFromStore,
        loadingLocation,
        showLocationModal,
        getDistanceInKm,
        setShowLocationModal,
        setSavedLocation,
        detectLocation,
        refreshStoreLocation,
        refreshStores: fetchStores,
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

