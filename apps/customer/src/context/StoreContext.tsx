"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface StoreStatus {
  is_open: boolean;
}

interface StoreTimings {
  open_time: string;
  close_time: string;
  days: string;
}

interface StoreContextType {
  isStoreOpen: boolean;
  storeStatus: StoreStatus | null;
  storeTimings: StoreTimings | null;
  loading: boolean;
  refreshStoreStatus: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [storeTimings, setStoreTimings] = useState<StoreTimings | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const supabase = createClient();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("key, value");

      if (error) throw error;

      let status: StoreStatus = { is_open: true };
      let timings: StoreTimings = { open_time: "08:00", close_time: "22:00", days: "Mon - Sun" };

      data?.forEach((row: any) => {
        if (row.key === "store_status") status = row.value;
        if (row.key === "store_timings") timings = row.value;
      });

      setStoreStatus(status);
      setStoreTimings(timings);
      
      // Calculate isStoreOpen
      if (!status.is_open) {
        setIsStoreOpen(false);
      } else {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const [openHour, openMinute] = timings.open_time.split(":").map(Number);
        const [closeHour, closeMinute] = timings.close_time.split(":").map(Number);

        const nowMinutes = currentHour * 60 + currentMinute;
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        let isOpen = false;
        if (closeMinutes < openMinutes) {
          isOpen = nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
        } else {
          isOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
        }
        setIsStoreOpen(isOpen);
      }
    } catch (err) {
      console.error("Failed to load store settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes in store settings so it syncs across all pages instantly
    const channel = supabase
      .channel("store-status-customer-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <StoreContext.Provider value={{ isStoreOpen, storeStatus, storeTimings, loading, refreshStoreStatus: fetchSettings }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
