"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ShoppingBasket, ShoppingCart, Tag, TrendingUp, AlertTriangle, Search, Plus, Edit, Trash2, Check, RefreshCw, Loader2, User, Bell, Settings, Eye, EyeOff } from "lucide-react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import NotificationManager from "@/components/NotificationManager";

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  original_price: number;
  stock: number;
  weight: string;
  category: string;
  category_id: string;
  images?: string[];
  delivery_time?: string;
  is_organic?: boolean;
  is_seasonal?: boolean;
  is_exotic?: boolean;
  is_hidden?: boolean;
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
}

interface AdminOrder {
  id: string;
  db_id: string;
  customer: string;
  phone?: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
  total: number;
  status: string;
  date: string;
  payment_method?: string;
  payment_status?: string;
  discount_amount?: number;
  delivery_fee?: number;
  total_amount?: number;
  coupon_code?: string | null;
  delivery_notes?: string | null;
  order_items?: any[];
  cancel_reason?: string | null;
}

interface AdminCoupon {
  code: string;
  type: string;
  value: string;
  minOrder: string;
  active: boolean;
}

function AdminPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "orders" | "coupons" | "notifications">("orders");

  // Sync tab state from query parameters (useful when navigating from profile back to admin)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["dashboard", "products", "orders", "coupons", "notifications"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [incomingOrdersQueue, setIncomingOrdersQueue] = useState<any[]>([]);
  const [showFullScreenNotification, setShowFullScreenNotification] = useState(false);
  const incomingOrder = incomingOrdersQueue[0];

  // Stop continuous vibration when the incoming orders queue becomes empty
  useEffect(() => {
    if (!loadingData && incomingOrdersQueue.length === 0 && typeof window !== "undefined" && (window as any).Capacitor) {
      import("@capacitor/core").then(({ registerPlugin }) => {
        const BackgroundActivity = registerPlugin("BackgroundActivity");
        (BackgroundActivity as any).stopVibration().catch((err: any) => console.error(err));
      });
    }
  }, [incomingOrdersQueue, loadingData]);
  
  // Order management states
  const [ordersTab, setOrdersTab] = useState<"active" | "completed">("active");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [refreshingOrders, setRefreshingOrders] = useState(false);

  // Sync selectedOrder if orderId is provided in query parameters (e.g. from push notification)
  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");
    if (orderIdParam && selectedOrder?.db_id !== orderIdParam) {
      const fetchAndSelectOrder = async () => {
        const { data: o } = await supabase
          .from("orders")
          .select("*, order_items(*, products(weight)), profiles(full_name, phone), addresses(*)")
          .eq("id", orderIdParam)
          .maybeSingle();
        
        if (o) {
          setSelectedOrder({
            id: o.id.slice(0, 8).toUpperCase(),
            db_id: o.id,
            customer: o.profiles?.full_name || o.profiles?.phone || "Anonymous",
            phone: o.profiles?.phone || "",
            address: o.addresses ? `${o.addresses.building_name}, ${o.addresses.complete_address}` : "Saved Address",
            lat: o.addresses?.latitude || null,
            lon: o.addresses?.longitude || null,
            total: parseFloat(o.net_amount),
            status: o.status,
            payment_method: o.payment_method || "COD",
            payment_status: o.payment_status || "pending",
            discount_amount: parseFloat(o.discount_amount) || 0,
            delivery_fee: parseFloat(o.delivery_fee) || 0,
            total_amount: parseFloat(o.total_amount) || 0,
            coupon_code: o.coupon_code || null,
            delivery_notes: o.delivery_notes || null,
            cancel_reason: o.cancel_reason || null,
            date: new Date(o.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            order_items: o.order_items || [],
          });
          setActiveTab("orders");
        }
      }
      fetchAndSelectOrder();
    }
  }, [searchParams, supabase, selectedOrder]);

  // Cancellation States
  const [cancelPrompt, setCancelPrompt] = useState<{ orderId: string; itemId?: string } | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  // Product editing states
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to supabase storage bucket 'product-images'
      let { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      // Create bucket if missing
      if (uploadError && uploadError.message?.toLowerCase().includes('bucket not found')) {
        await supabase.storage.createBucket('product-images', { public: true });
        const retryResult = await supabase.storage
          .from('product-images')
          .upload(filePath, file);
        uploadError = retryResult.error;
      }

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [publicUrl]
        });
      }
    } catch (err: any) {
      console.error('Image upload failed, converting to Base64:', err);
      // Fallback to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editingProduct) {
          setEditingProduct({
            ...editingProduct,
            images: [reader.result as string]
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddNewProduct = () => {
    setEditingProduct({
      id: "", // Empty ID signals "NEW" product creation
      name: "",
      price: 0,
      original_price: 0,
      stock: 10,
      weight: "",
      category: "",
      category_id: categories[0]?.id || "",
      images: [],
      delivery_time: "10 mins",
      is_organic: false,
      is_seasonal: false,
      is_exotic: false,
      is_hidden: false
    });
  };

  // State Management
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);

  // Search queries
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSortKey, setProductSortKey] = useState<"category" | "name" | "price" | "stock">("category");
  const [orderSearch, setOrderSearch] = useState("");

  // Store Settings States
  const [storeOpenStatus, setStoreOpenStatus] = useState<boolean>(true);
  const [storeOpenTime, setStoreOpenTime] = useState<string>("08:00");
  const [storeCloseTime, setStoreCloseTime] = useState<string>("22:00");
  const [storeDays, setStoreDays] = useState<string>("Mon - Sun");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Authenticate Admin Session
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login?redirect=/");
        return;
      }

      // Check role directly from public.profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.push("/login?redirect=/");
      } else {
        setAuthLoading(false);
      }
    }
    checkAdmin();
  }, [router, supabase.auth]);

  // Request system notification permission on mount for Admin App
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(err => console.error("Permission request failed:", err));
      }
    }

    // Request Capacitor Local Notification permission on Android/iOS
    async function requestCapacitorPermission() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== "granted") {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.error("Failed to request Capacitor notification permissions:", e);
        }
      }
    }
    requestCapacitorPermission();
  }, []);

  // Silent background fetch for auto-refreshing orders every second
  useEffect(() => {
    if (authLoading) return;
    
    const interval = setInterval(async () => {
      try {
        const { data: dbOrders } = await supabase
          .from("orders")
          .select("*, order_items(*, products(weight)), profiles(full_name, phone), addresses(*)")
          .order("created_at", { ascending: false });
        
        if (dbOrders) {
          const mappedOrders = dbOrders.map((o: any) => ({
            id: o.id.slice(0, 8).toUpperCase(),
            db_id: o.id,
            customer: o.profiles?.full_name || o.profiles?.phone || "Anonymous",
            phone: o.profiles?.phone || "",
            address: o.addresses ? `${o.addresses.building_name}, ${o.addresses.complete_address}` : "Saved Address",
            lat: o.addresses?.latitude || null,
            lon: o.addresses?.longitude || null,
            total: parseFloat(o.net_amount),
            status: o.status,
            payment_method: o.payment_method || "COD",
            payment_status: o.payment_status || "pending",
            discount_amount: parseFloat(o.discount_amount) || 0,
            delivery_fee: parseFloat(o.delivery_fee) || 0,
            total_amount: parseFloat(o.total_amount) || 0,
            coupon_code: o.coupon_code,
            delivery_notes: o.delivery_notes,
            order_items: o.order_items || [],
            date: new Date(o.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })
          }));

          setOrders(mappedOrders);
          syncIncomingOrdersQueue(mappedOrders);
          
          // Sync selectedOrder if open
          setSelectedOrder((curr) => {
            if (!curr) return null;
            const found = mappedOrders.find(o => o.db_id === curr.db_id);
            return found || curr;
          });
        }
      } catch (err) {
        console.error("Silent background fetch failed:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [authLoading, supabase]);

  // Real-time listener for incoming orders
  useEffect(() => {
    if (authLoading) return;

    const channel = supabase
      .channel(`new-orders-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders"
        },
        async (payload) => {
          // Fetch complete profile and address for detail presentation
          const { data: orderWithDetails } = await supabase
            .from("orders")
            .select("*, order_items(*, products(weight)), profiles(full_name, phone), addresses(*)")
            .eq("id", payload.new.id)
            .single();

          if (orderWithDetails) {
            const mapped = {
              id: orderWithDetails.id.slice(0, 8).toUpperCase(),
              db_id: orderWithDetails.id,
              customer: orderWithDetails.profiles?.full_name || orderWithDetails.profiles?.phone || "Anonymous User",
              phone: orderWithDetails.profiles?.phone || "",
              total: parseFloat(orderWithDetails.net_amount),
              address: orderWithDetails.addresses ? `${orderWithDetails.addresses.building_name}, ${orderWithDetails.addresses.complete_address}` : "Saved Delivery Location",
              notes: orderWithDetails.delivery_notes || "No notes",
              order_items: orderWithDetails.order_items || [],
              discount_amount: parseFloat(orderWithDetails.discount_amount) || 0,
              delivery_fee: parseFloat(orderWithDetails.delivery_fee) || 0,
              total_amount: parseFloat(orderWithDetails.total_amount) || 0,
              coupon_code: orderWithDetails.coupon_code
            };

            setIncomingOrdersQueue((prev) => {
              if (prev.some((o) => o.db_id === mapped.db_id)) return prev;
              return [...prev, mapped];
            });
            setShowFullScreenNotification(true);

            // Instantly refresh orders table
            loadDbData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, supabase]);

  // Helper to sync incoming orders queue with pending database orders
  const syncIncomingOrdersQueue = (mappedOrders: any[]) => {
    const pendingMapped = mappedOrders.filter(
      (o) => o.status === "placed" || o.status === "pending"
    ).map((o) => ({
      id: o.id,
      db_id: o.db_id,
      customer: o.customer,
      phone: o.phone,
      total: o.total,
      address: o.address,
      notes: o.delivery_notes || "No notes",
      order_items: o.order_items || [],
      status: o.status
    }));

    if (pendingMapped.length > 0) {
      setIncomingOrdersQueue((prev) => {
        const nextQueue = [...prev];
        const filteredQueue = nextQueue.filter((qOrder) =>
          pendingMapped.some((p) => p.db_id === qOrder.db_id)
        );
        pendingMapped.forEach((mapped) => {
          if (!filteredQueue.some((o) => o.db_id === mapped.db_id)) {
            filteredQueue.push(mapped);
          }
        });
        return filteredQueue;
      });
      setShowFullScreenNotification(true);
    } else {
      setIncomingOrdersQueue([]);
      setShowFullScreenNotification(false);
    }
  };

  // Load live Supabase database content
  const loadDbData = async () => {
    try {
      setLoadingData(true);
      
      // 1. Fetch Categories
      const { data: dbCats } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (dbCats) {
        setCategories(dbCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug
        })));
      }

      // 2. Fetch Products & join categories
      const { data: dbProds } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");
      
      if (dbProds) {
        setProducts(dbProds.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          original_price: parseFloat(p.original_price),
          stock: p.stock,
          weight: p.weight,
          category: p.categories?.name || "Uncategorized",
          category_id: p.category_id || "",
          images: p.images || [],
          delivery_time: p.delivery_time || "10 mins",
          is_organic: p.is_organic || false,
          is_seasonal: p.is_seasonal || false,
          is_exotic: p.is_exotic || false,
          is_hidden: p.is_hidden || false
        })));
      }

      // 2. Fetch Orders, join profiles & addresses
      const { data: dbOrders } = await supabase
        .from("orders")
        .select("*, order_items(*, products(weight)), profiles(full_name, phone), addresses(*)")
        .order("created_at", { ascending: false });
      
      if (dbOrders) {
        const mappedOrders = dbOrders.map((o: any) => ({
          id: o.id.slice(0, 8).toUpperCase(), // readable order ID snippet
          db_id: o.id, // actual UUID for updates
          customer: o.profiles?.full_name || o.profiles?.phone || "Anonymous",
          phone: o.profiles?.phone || "",
          address: o.addresses ? `${o.addresses.building_name}, ${o.addresses.complete_address}` : "Saved Address",
          lat: o.addresses?.latitude || null,
          lon: o.addresses?.longitude || null,
          total: parseFloat(o.net_amount),
          status: o.status,
          payment_method: o.payment_method || "COD",
          payment_status: o.payment_status || "pending",
          discount_amount: parseFloat(o.discount_amount) || 0,
          delivery_fee: parseFloat(o.delivery_fee) || 0,
          total_amount: parseFloat(o.total_amount) || 0,
          coupon_code: o.coupon_code,
          delivery_notes: o.delivery_notes,
          order_items: o.order_items || [],
          date: new Date(o.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })
        }));

        setOrders(mappedOrders);
        syncIncomingOrdersQueue(mappedOrders);

        // Sync selectedOrder if open
        setSelectedOrder((curr) => {
          if (!curr) return null;
          const found = mappedOrders.find(o => o.db_id === curr.db_id);
          return found || curr;
        });
      }

      // 3. Fetch Coupons
      const { data: dbCoupons } = await supabase
        .from("coupons")
        .select("*")
        .order("code");
      
      if (dbCoupons) {
        setCoupons(dbCoupons.map((c: any) => ({
          code: c.code,
          type: c.discount_type === "percentage" ? "Percentage" : "Flat",
          value: c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`,
          minOrder: `₹${c.min_order_value}`,
          active: c.is_active
        })));
      }

      // 4. Fetch Store Settings
      const { data: dbSettings } = await supabase
        .from("store_settings")
        .select("key, value");

      if (dbSettings) {
        dbSettings.forEach((row: any) => {
          if (row.key === "store_status") {
            setStoreOpenStatus(row.value.is_open);
          }
          if (row.key === "store_timings") {
            setStoreOpenTime(row.value.open_time);
            setStoreCloseTime(row.value.close_time);
            setStoreDays(row.value.days);
          }
        });
      }
    } catch (err) {
      console.error("Failed to load admin panel data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadDbData();
    }
  }, [authLoading]);

  // Handler: Update product stock in database
  const handleUpdateStock = async (id: string, newStock: number) => {
    const stockVal = Math.max(newStock, 0);
    // Optimistic UI state update
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: stockVal } : p)));
    
    await supabase.from("products").update({ stock: stockVal }).eq("id", id);
  };

  // Handler: Toggle product visibility in database
  const handleToggleProductVisibility = async (id: string, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    // Optimistic UI state update
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: nextHidden } : p)));
    
    const { error } = await supabase.from("products").update({ is_hidden: nextHidden }).eq("id", id);
    if (error) {
      console.error("Failed to update product visibility:", error);
      // Revert optimistic update on failure
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: currentHidden } : p)));
    }
  };

  // Handler: Save product changes in database
  const handleSaveProduct = async (updated: AdminProduct) => {
    if (!updated.name.trim()) return;
    try {
      setUpdatingProduct(true);
      
      const priceVal = parseFloat(updated.price as any) || 0;
      const originalPriceVal = parseFloat(updated.original_price as any) || 0;
      const discountVal = originalPriceVal > 0 
        ? Math.max(0, Math.min(100, ((originalPriceVal - priceVal) / originalPriceVal) * 100))
        : 0;

      const isNew = !updated.id;
      const slugVal = updated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (isNew) {
        const { error } = await supabase
          .from("products")
          .insert({
            name: updated.name.trim(),
            slug: slugVal,
            price: priceVal,
            original_price: originalPriceVal,
            discount: parseFloat(discountVal.toFixed(2)),
            weight: updated.weight.trim(),
            stock: parseInt(updated.stock as any) || 0,
            category_id: updated.category_id || null,
            images: updated.images || [],
            delivery_time: updated.delivery_time || "10 mins",
            is_organic: !!updated.is_organic,
            is_seasonal: !!updated.is_seasonal,
            is_exotic: !!updated.is_exotic,
            is_hidden: !!updated.is_hidden
          });

        if (error) throw error;
      } else {
        // Optimistic UI state update (only for edits)
        setProducts((prev) => 
          prev.map((p) => 
            p.id === updated.id 
              ? { 
                  ...updated, 
                  price: priceVal, 
                  original_price: originalPriceVal, 
                  is_hidden: !!updated.is_hidden,
                  category: categories.find(c => c.id === updated.category_id)?.name || updated.category 
                } 
              : p
          )
        );

        const { error } = await supabase
          .from("products")
          .update({
            name: updated.name.trim(),
            price: priceVal,
            original_price: originalPriceVal,
            discount: parseFloat(discountVal.toFixed(2)),
            weight: updated.weight.trim(),
            stock: parseInt(updated.stock as any) || 0,
            category_id: updated.category_id || null,
            images: updated.images || [],
            delivery_time: updated.delivery_time || "10 mins",
            is_organic: !!updated.is_organic,
            is_seasonal: !!updated.is_seasonal,
            is_exotic: !!updated.is_exotic,
            is_hidden: !!updated.is_hidden
          })
          .eq("id", updated.id);

        if (error) throw error;
      }

      setEditingProduct(null);
      loadDbData();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product details.");
      loadDbData();
    } finally {
      setUpdatingProduct(false);
    }
  };

  // Handler: Save store settings in database
  const handleSaveStoreSettings = async (isOpen: boolean, openTime: string, closeTime: string, days: string) => {
    try {
      setSavingSettings(true);
      
      const { error: statusErr } = await supabase
        .from("store_settings")
        .update({ value: { is_open: isOpen } })
        .eq("key", "store_status");
        
      if (statusErr) throw statusErr;
      
      const { error: timingsErr } = await supabase
        .from("store_settings")
        .update({ value: { open_time: openTime, close_time: closeTime, days: days } })
        .eq("key", "store_timings");
        
      if (timingsErr) throw timingsErr;
      
      alert("Store settings saved successfully! 🎉");
    } catch (err) {
      console.error("Failed to save store settings:", err);
      alert("Failed to save store settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handler: Update order status in database
  const handleUpdateOrderStatus = async (dbId: string, newStatus: string) => {
    // Optimistic UI state update
    setOrders((prev) => prev.map((o) => (o.db_id === dbId ? { ...o, status: newStatus } : o)));
    
    setSelectedOrder((curr) => {
      if (curr && curr.db_id === dbId) {
        return { ...curr, status: newStatus };
      }
      return curr;
    });

    await supabase.from("orders").update({ status: newStatus as any }).eq("id", dbId);
  };

  // Handler: Cancel entire order with reason
  const handleCancelOrder = async (dbId: string, reason: string) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.db_id === dbId
            ? { ...o, status: "cancelled", cancel_reason: reason }
            : o
        )
      );

      setSelectedOrder((curr) => {
        if (curr && curr.db_id === dbId) {
          return { ...curr, status: "cancelled", cancel_reason: reason };
        }
        return curr;
      });

      setIncomingOrdersQueue((prev) => {
        const nextQueue = prev.filter((o) => o.db_id !== dbId);
        if (nextQueue.length === 0) {
          setShowFullScreenNotification(false);
        }
        return nextQueue;
      });

      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancel_reason: reason })
        .eq("id", dbId);

      if (error) throw error;
      
      setCancelPrompt(null);
      setCancelReasonInput("");
      loadDbData();
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order.");
    }
  };

  // Handler: Cancel specific item from an order (Partial Cancellation)
  const handleCancelItem = async (orderDbId: string, itemDbId: string, reason: string) => {
    try {
      // 1. Mark the item as cancelled in order_items table
      const { error: itemErr } = await supabase
        .from("order_items")
        .update({ is_cancelled: true, cancel_reason: reason })
        .eq("id", itemDbId);

      if (itemErr) throw itemErr;

      // 2. Fetch the current items in the order to calculate new totals
      const { data: items, error: fetchErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderDbId);

      if (fetchErr) throw fetchErr;

      // 3. Recalculate net_amount (sum of active items)
      const activeItems = items ? items.filter((item: any) => !item.is_cancelled) : [];
      
      if (activeItems.length === 0) {
        // If all items are cancelled, cancel the entire order
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            status: "cancelled",
            cancel_reason: "All items cancelled",
            net_amount: 0,
            total_amount: 0
          })
          .eq("id", orderDbId);

        if (orderErr) throw orderErr;
      } else {
        // Calculate new net amount
        const newSubtotal = activeItems.reduce(
          (sum: number, item: any) => sum + (item.quantity * parseFloat(item.price)),
          0
        );

        // Fetch original order details to get delivery fee and discount amount
        const { data: orderData, error: orderFetchErr } = await supabase
          .from("orders")
          .select("delivery_fee, discount_amount")
          .eq("id", orderDbId)
          .single();

        if (orderFetchErr) throw orderFetchErr;

        const deliveryFee = parseFloat(orderData.delivery_fee) || 0;
        const discountAmount = parseFloat(orderData.discount_amount) || 0;
        
        // Final total amount
        const newTotalAmount = Math.max(0, newSubtotal - discountAmount) + deliveryFee;

        // Update the order in the database
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            net_amount: newSubtotal,
            total_amount: newTotalAmount
          })
          .eq("id", orderDbId);

        if (orderErr) throw orderErr;
      }

      setCancelPrompt(null);
      setCancelReasonInput("");
      loadDbData();
    } catch (err) {
      console.error("Failed to cancel item partially:", err);
      alert("Failed to partially cancel item.");
    }
  };

  // State Machine: Get Next logical action button for status updates
  const getNextStatusAction = (o: any) => {
    const handleActionClick = (e: React.MouseEvent, nextStatus: string) => {
      e.stopPropagation();
      handleUpdateOrderStatus(o.db_id, nextStatus);
    };

    switch (o.status) {
      case "pending":
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => handleActionClick(e, "confirmed")}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Accept
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCancelPrompt({ orderId: o.db_id });
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              Reject
            </button>
          </div>
        );
      case "confirmed":
        return (
          <button
            onClick={(e) => handleActionClick(e, "preparing")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Start Packing
          </button>
        );
      case "preparing":
        return (
          <button
            onClick={(e) => handleActionClick(e, "out_for_delivery")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all shadow-sm animate-pulse cursor-pointer"
          >
            Dispatch (Rider Handover)
          </button>
        );
      case "out_for_delivery":
        return (
          <button
            onClick={(e) => handleActionClick(e, "delivered")}
            className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all shadow-premium cursor-pointer"
          >
            Mark Delivered
          </button>
        );
      case "delivered":
        return (
          <span className="text-[10px] font-extrabold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 block text-center">
            ✓ Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="text-[10px] font-extrabold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 block text-center">
            ✕ Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Dispatch Rider Console showing name, gmap navigation, and phone call buttons
  const renderDispatchDetails = (o: any) => {
    if (o.status !== "preparing" && o.status !== "out_for_delivery") return null;

    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-2 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Dispatch Rider Console
          </span>
          <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
            {o.status === "preparing" ? "Packing" : "On the Way"}
          </span>
        </div>

        <div className="space-y-0.5 text-[11px] font-bold text-slate-700">
          <p className="text-slate-800">👤 Customer: {o.customer}</p>
          <p className="text-slate-500 font-medium leading-relaxed">📍 Address: {o.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {o.phone && (
            <a
              href={`tel:${o.phone}`}
              className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-extrabold text-[10px] py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              📞 Call Customer
            </a>
          )}
          {o.lat && o.lon && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 bg-primary hover:bg-primary-dark text-white font-extrabold text-[10px] py-1.5 rounded-lg transition-all shadow-premium cursor-pointer"
            >
              🗺️ Navigate Maps
            </a>
          )}
        </div>
      </div>
    );
  };

  // Handler: Toggle coupon activation in database
  const handleToggleCoupon = async (code: string) => {
    const coupon = coupons.find((c) => c.code === code);
    if (!coupon) return;
    const nextActive = !coupon.active;
    
    // Optimistic UI state update
    setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, active: nextActive } : c)));
    
    await supabase.from("coupons").update({ is_active: nextActive }).eq("code", code);
  };

  // Dynamic Live Metrics
  const lowStockCount = products.filter((p) => p.stock <= 5).length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "preparing" || o.status === "out_for_delivery").length;
  const totalRevenueSum = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Checking admin credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-12">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Controls - Desktop Only */}
        <aside className="hidden md:block w-60 bg-white rounded-xl shadow-card border border-slate-100 p-4 space-y-1.5 self-start sticky top-24">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
            Admin Controls
          </span>
          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "products", label: "Products & Stock", icon: ShoppingBasket },
              { id: "orders", label: "Orders Manager", icon: ShoppingCart },
              { id: "coupons", label: "Coupons", icon: Tag },
              { id: "notifications", label: "Notifications Center", icon: Bell },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white shadow-premium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Dynamic Display Panel */}
        <div className="flex-1 min-w-0">
          {loadingData ? (
            <div className="bg-white rounded-xl shadow-card border border-slate-100/80 p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs font-bold text-slate-400 mt-2">Retrieving live store metrics...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* KPI Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Delivered Revenue
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                        ₹{totalRevenueSum.toLocaleString("en-IN")}
                      </h3>
                      <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 mt-1">
                        <TrendingUp className="h-3 w-3" /> Live calculations
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Total Orders
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                        {orders.length}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">
                        Live database count
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Active Pending
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                        {pendingOrdersCount}
                      </h3>
                      <span className="text-[10px] text-amber-600 font-bold block mt-1">
                        Needs packing/delivery
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Low Stock Alerts
                        </span>
                        <h3 className="text-xl md:text-2xl font-black text-red-600 mt-1">
                          {lowStockCount}
                        </h3>
                        <span className="text-[10px] text-red-500 font-bold block mt-1">
                          Items stock &le; 5
                        </span>
                      </div>
                      {lowStockCount > 0 && (
                        <div className="p-1.5 bg-red-50 text-red-600 rounded-full animate-pulse">
                          <AlertTriangle className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Revenue Graph & Sales Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue trend mock chart */}
                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80 lg:col-span-2 space-y-4">
                      <h3 className="text-xs font-extrabold text-slate-800 border-b border-slate-50 pb-2">
                        Weekly Revenue Trend
                      </h3>
                      <div className="h-48 flex items-end gap-4 pt-4 px-2">
                        {[30, 45, 60, 50, 75, 90, 80].map((height, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                              className="w-full bg-primary hover:bg-primary-dark rounded-t-md cursor-pointer transition-colors duration-150"
                            />
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">
                              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Popular categories list */}
                    <div className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4">
                      <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-2">
                        Category Share
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          { label: "Fresh Vegetables", pct: 45, color: "bg-primary" },
                          { label: "Fresh Fruits", pct: 30, color: "bg-secondary" },
                          { label: "Organic Greens", pct: 15, color: "bg-accent" },
                          { label: "Exotic Veggies", pct: 10, color: "bg-amber-400" },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex justify-between font-bold text-slate-600">
                              <span>{item.label}</span>
                              <span>{item.pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`${item.color} h-full`} style={{ width: `${item.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "products" && (
                <motion.div
                  key="products-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Header Controls */}
                  <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-card border border-slate-100/80">
                    <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:bg-white focus:border-primary"
                        />
                      </div>
                      
                      {/* Category Filter */}
                      <select
                        value={productCategoryFilter}
                        onChange={(e) => setProductCategoryFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-primary cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>

                      {/* Sort By Select */}
                      <select
                        value={productSortKey}
                        onChange={(e) => setProductSortKey(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-primary cursor-pointer"
                      >
                        <option value="category">Sort by Category</option>
                        <option value="name">Sort by Name</option>
                        <option value="price">Sort by Price (Low to High)</option>
                        <option value="stock">Sort by Stock (Low to High)</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAddNewProduct}
                      className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-premium cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="h-4.5 w-4.5" /> Add New Product
                    </button>
                  </div>

                  {/* Products CRUD Table (Desktop only) */}
                  <div className="hidden md:block bg-white rounded-xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="p-4">Name</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {products.filter((p) => {
                            const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
                            const matchesCategory = productCategoryFilter === "all" || p.category_id === productCategoryFilter;
                            return matchesSearch && matchesCategory;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                                <div className="flex flex-col items-center gap-1.5 justify-center py-4">
                                  <span className="text-xl">🔍</span>
                                  <span>No products found matching your filters.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            products
                              .filter((p) => {
                                const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
                                const matchesCategory = productCategoryFilter === "all" || p.category_id === productCategoryFilter;
                                return matchesSearch && matchesCategory;
                              })
                              .sort((a, b) => {
                                if (productSortKey === "category") {
                                  const catCompare = a.category.localeCompare(b.category);
                                  if (catCompare !== 0) return catCompare;
                                  return a.name.localeCompare(b.name);
                                }
                                if (productSortKey === "price") {
                                  return a.price - b.price;
                                }
                                if (productSortKey === "stock") {
                                  return a.stock - b.stock;
                                }
                                return a.name.localeCompare(b.name);
                              })
                              .map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        {p.images && p.images[0] ? (
                                          <img
                                            src={p.images[0]}
                                            alt={p.name}
                                            className="w-full h-full object-contain p-0.5"
                                          />
                                        ) : (
                                          <span className="text-[9px] font-bold text-slate-400">No Img</span>
                                        )}
                                      </div>
                                      <div>
                                        <span className="font-extrabold text-slate-900 block">{p.name}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{p.weight}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-500">{p.category}</td>
                                  <td className="p-4">
                                    <span className="font-black text-slate-900">₹{p.price}</span>
                                    {p.original_price > p.price && (
                                      <span className="text-[10px] text-slate-400 line-through block font-medium">MRP: ₹{p.original_price}</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                                      p.stock > 5 
                                        ? "bg-green-50 text-green-600 border border-green-100" 
                                        : p.stock > 0
                                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                                        : "bg-red-50 text-red-600 border border-red-100"
                                    }`}>
                                      {p.stock > 0 ? `${p.stock} in stock` : "Out of Stock"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => handleToggleProductVisibility(p.id, !!p.is_hidden)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-150 border cursor-pointer ${
                                        p.is_hidden
                                          ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                      }`}
                                      title={p.is_hidden ? "Show product in catalog" : "Hide product from catalog"}
                                    >
                                      {p.is_hidden ? (
                                        <>
                                          <EyeOff className="h-3 w-3 text-slate-400" /> Hidden
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="h-3 w-3 text-emerald-600" /> Visible
                                        </>
                                      )}
                                    </button>
                                  </td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={() => setEditingProduct(p)}
                                      className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                                    >
                                      <Edit className="h-3 w-3" /> Edit
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Products Mobile Card View (Mobile only) */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {products
                      .filter((p) => {
                        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
                        const matchesCategory = productCategoryFilter === "all" || p.category_id === productCategoryFilter;
                        return matchesSearch && matchesCategory;
                      })
                      .sort((a, b) => {
                        if (productSortKey === "category") {
                          const catCompare = a.category.localeCompare(b.category);
                          if (catCompare !== 0) return catCompare;
                          return a.name.localeCompare(b.name);
                        }
                        if (productSortKey === "price") {
                          return a.price - b.price;
                        }
                        if (productSortKey === "stock") {
                          return a.stock - b.stock;
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map((p) => (
                        <div key={p.id} className="bg-white p-4 rounded-xl shadow-card border border-slate-100/80 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {p.images && p.images[0] ? (
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="w-full h-full object-contain p-0.5"
                                  />
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400">No Img</span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-sm">{p.name}</h3>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                                  {p.weight}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100/70 px-2.5 py-1 rounded">
                                {p.category}
                              </span>
                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Price</span>
                              <span className="text-xs font-black text-slate-900">₹{p.price}</span>
                              {p.original_price > p.price && (
                                <span className="text-[9px] text-slate-400 line-through block">MRP: ₹{p.original_price}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Status</span>
                                <button
                                  onClick={() => handleToggleProductVisibility(p.id, !!p.is_hidden)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-colors border cursor-pointer ${
                                    p.is_hidden
                                      ? "bg-slate-100 text-slate-500 border-slate-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  }`}
                                  title={p.is_hidden ? "Show product" : "Hide product"}
                                >
                                  {p.is_hidden ? <EyeOff className="h-2.5 w-2.5 text-slate-400" /> : <Eye className="h-2.5 w-2.5 text-emerald-600" />}
                                  {p.is_hidden ? "Hidden" : "Visible"}
                                </button>
                              </div>

                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Stock Status</span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  p.stock > 5 
                                    ? "bg-green-50 text-green-600 border border-green-100" 
                                    : p.stock > 0
                                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                                    : "bg-red-50 text-red-600 border border-red-100"
                                }`}>
                                  {p.stock > 0 ? `${p.stock} Left` : "Out of Stock"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "orders" && (
                <motion.div
                  key="orders-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 font-sans"
                >
                  {/* Category Filter Tabs & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-card border border-slate-100/80 font-sans">
                    {/* Sub-tabs switcher */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setOrdersTab("active")}
                        className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer ${
                          ordersTab === "active"
                            ? "bg-white text-primary shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Active Orders ({orders.filter(o => ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status)).length})
                      </button>
                      <button
                        onClick={() => setOrdersTab("completed")}
                        className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer ${
                          ordersTab === "completed"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Completed ({orders.filter(o => ["delivered", "cancelled"].includes(o.status)).length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Search Bar */}
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by customer / snippet..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:bg-white"
                        />
                      </div>
                      {/* Refresh Button */}
                      <button
                        onClick={async () => {
                          setRefreshingOrders(true);
                          await loadDbData();
                          setRefreshingOrders(false);
                        }}
                        disabled={refreshingOrders}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-primary/10 text-slate-500 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
                        title="Refresh Orders"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingOrders ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Orders table with details action (Desktop only) */}
                  <div className="hidden md:block bg-white rounded-xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {orders
                            .filter(
                              (o) =>
                                (o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
                                 o.id.toLowerCase().includes(orderSearch.toLowerCase())) &&
                                (ordersTab === "active"
                                  ? ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
                                  : ["delivered", "cancelled"].includes(o.status))
                            )
                            .map((o) => (
                              <tr
                                key={o.id}
                                onClick={() => setSelectedOrder(o)}
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                              >
                                <td className="p-4 font-extrabold text-slate-900">
                                  #{o.id}
                                  <span className="text-[9px] text-slate-400 font-bold block pt-0.5">
                                    {o.payment_method?.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="font-bold block text-slate-800">{o.customer}</span>
                                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-xs block">{o.address}</span>
                                  {renderDispatchDetails(o)}
                                </td>
                                <td className="p-4 text-slate-500 font-medium">{o.date}</td>
                                <td className="p-4 text-slate-900 font-extrabold">₹{o.total.toFixed(2)}</td>
                                <td className="p-4">
                                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                    o.status === "delivered" ? "bg-green-50 text-green-600 border border-green-100" :
                                    o.status === "cancelled" ? "bg-red-50 text-red-600 border border-red-100" :
                                    o.status === "pending" ? "bg-orange-50 text-orange-600 border border-orange-100" :
                                    "bg-blue-50 text-blue-600 border border-blue-100"
                                  }`}>
                                    {o.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    {getNextStatusAction(o)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {orders.filter(
                      (o) =>
                        (o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
                         o.id.toLowerCase().includes(orderSearch.toLowerCase())) &&
                        (ordersTab === "active"
                          ? ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
                          : ["delivered", "cancelled"].includes(o.status))
                    ).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <ShoppingCart className="h-12 w-12 text-slate-200 mb-4" />
                        <h3 className="text-sm font-extrabold text-slate-400">No orders right now</h3>
                        <p className="text-xs text-slate-300 mt-1">New orders will appear here automatically</p>
                      </div>
                    )}
                  </div>

                  {/* Orders Mobile Card View (Mobile only) */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {orders
                      .filter(
                        (o) =>
                          (o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
                           o.id.toLowerCase().includes(orderSearch.toLowerCase())) &&
                          (ordersTab === "active"
                            ? ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
                            : ["delivered", "cancelled"].includes(o.status))
                      )
                      .map((o) => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="bg-white p-4 rounded-xl shadow-card border border-slate-100/80 space-y-3.5 cursor-pointer active:bg-slate-50/50 transition-all"
                        >
                          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm">#{o.id}</span>
                              <p className="text-[10px] text-slate-400 font-bold">{o.date} | {o.payment_method?.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Net Amount</span>
                              <span className="text-xs font-black text-primary">₹{o.total.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Customer Details</span>
                            {o.status !== "preparing" && o.status !== "out_for_delivery" ? (
                              <>
                                <span className="font-extrabold text-slate-800">{o.customer}</span>
                                <p className="text-[10px] text-slate-500 font-medium leading-normal">
                                  {o.address}
                                </p>
                              </>
                            ) : (
                              renderDispatchDetails(o)
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Status</span>
                              <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider mt-0.5 ${
                                o.status === "delivered" ? "bg-green-50 text-green-600 border border-green-100" :
                                o.status === "cancelled" ? "bg-red-50 text-red-600 border border-red-100" :
                                "bg-blue-50 text-blue-600 border border-blue-100"
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            <div className="pt-0.5">
                              {getNextStatusAction(o)}
                            </div>
                          </div>
                        </div>
                      ))}
                    {orders.filter(
                      (o) =>
                        (o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
                         o.id.toLowerCase().includes(orderSearch.toLowerCase())) &&
                        (ordersTab === "active"
                          ? ["pending", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
                          : ["delivered", "cancelled"].includes(o.status))
                    ).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <ShoppingCart className="h-12 w-12 text-slate-200 mb-4" />
                        <h3 className="text-sm font-extrabold text-slate-400">No orders right now</h3>
                        <p className="text-xs text-slate-300 mt-1">New orders will appear here automatically</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "coupons" && (
                <motion.div
                  key="coupons-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {coupons.map((c) => (
                    <div key={c.code} className="bg-white p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-extrabold text-base text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleToggleCoupon(c.code)}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                              c.active ? "bg-primary" : "bg-slate-200"
                            }`}
                          >
                            <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${c.active ? "translate-x-4" : ""}`} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-700 pt-2">
                          Discount Value: <span className="text-slate-900 font-extrabold">{c.value}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          Min Order: {c.minOrder} | Type: {c.type}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        {c.active ? (
                          <>
                            <Check className="h-4.5 w-4.5 text-primary" /> Active in checkout drawer
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 text-slate-300" /> Inactive
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotificationManager />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
      
      {/* Mobile Admin Footer Nav - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-100 py-2.5 px-4 shadow-lg md:hidden flex justify-between items-center rounded-t-xl">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "products", label: "Products", icon: ShoppingBasket },
          { id: "orders", label: "Orders", icon: ShoppingCart },
          { id: "coupons", label: "Coupons", icon: Tag },
          { id: "notifications", label: "Alerts", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
            </button>
          );
        })}
        {/* Settings Link - Redirects to user settings */}
        <Link
          href="/settings"
          className="flex flex-col items-center relative gap-0.5 flex-1 cursor-pointer text-slate-400 hover:text-primary transition-colors"
        >
          <div className="p-1 rounded-full">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-bold">
            Settings
          </span>
        </Link>
      </div>

      {/* Product Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] text-slate-800"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingProduct.id ? "Edit Product Details" : "Add New Product"}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold leading-none mt-1 block">
                    {editingProduct.id ? `Product ID: ${editingProduct.id.slice(0, 8).toUpperCase()}...` : "New Product Creation"}
                  </span>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-450 hover:text-slate-700 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
                {/* Product Image Section */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col items-center">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider self-start">Product Image</span>
                  
                  {/* Preview Thumbnail */}
                  <div className="relative w-28 h-28 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shadow-inner group mb-2.5">
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-1.5 text-slate-500 font-bold">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Uploading...</span>
                      </div>
                    ) : editingProduct.images && editingProduct.images[0] ? (
                      <img
                        src={editingProduct.images[0]}
                        alt="Product Preview"
                        className="object-contain w-full h-full p-1.5"
                      />
                    ) : (
                      <span className="text-slate-400 font-bold">No Image</span>
                    )}
                  </div>

                  {/* Actions: File Select or URL Link */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-11 border-2 border-dashed border-slate-300 hover:border-primary rounded-xl cursor-pointer bg-white hover:bg-slate-50/50 transition-all select-none">
                        <div className="flex items-center gap-1.5 text-slate-600 font-extrabold text-[11px]">
                          <span>📁 Upload Image File</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageFileChange}
                        />
                      </label>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Or paste direct image link..."
                        value={editingProduct.images && editingProduct.images[0] ? (editingProduct.images[0].startsWith("data:") ? "" : editingProduct.images[0]) : ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct, images: e.target.value ? [e.target.value] : [] })}
                        className="w-full bg-white border border-slate-205 rounded-xl px-3 py-1.5 text-[10px] font-semibold focus:outline-none focus:border-primary placeholder-slate-400 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                {/* Category & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Category</label>
                    <select
                       value={editingProduct.category_id}
                       onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Weight / Pack Size</label>
                    <input
                      type="text"
                      value={editingProduct.weight}
                      onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* MRP & Selling Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">MRP (Original Price)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct.original_price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, original_price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-205 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Selling Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-205 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Level & Stock Status */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Stock Quantity</label>
                    <input
                      type="number"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Stock Status</label>
                    <div className="grid grid-cols-2 gap-2 h-[34px]">
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, stock: editingProduct.stock > 0 ? editingProduct.stock : 10 })}
                        className={`rounded-xl text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                          editingProduct.stock > 0
                            ? "bg-emerald-500 text-white shadow-premium"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        IN STOCK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, stock: 0 })}
                        className={`rounded-xl text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                          editingProduct.stock === 0
                            ? "bg-red-500 text-white shadow-premium"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        OUT OF STOCK
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Time & Flags */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Delivery Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 10 mins, 15 mins"
                      value={editingProduct.delivery_time || "10 mins"}
                      onChange={(e) => setEditingProduct({ ...editingProduct, delivery_time: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Product Status</label>
                    <div className="pt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none" title="Hide product from customer store catalog">
                        <input
                          type="checkbox"
                          checked={!!editingProduct.is_hidden}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_hidden: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        Hide from catalog (Visible otherwise)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProduct(editingProduct)}
                  disabled={updatingProduct}
                  className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs py-2 px-5 rounded-xl transition-all cursor-pointer shadow-premium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatingProduct ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> {editingProduct.id ? "Saving..." : "Creating..."}
                    </>
                  ) : (
                    editingProduct.id ? "Save Changes" : "Create Product"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[85vh] text-slate-800"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Order Details
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold leading-none mt-1 block">
                    ID: {selectedOrder.db_id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-455 hover:text-slate-700 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
                {/* Status Tracker & Date */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ordered On</span>
                    <span className="font-bold text-slate-700 mt-1 block">{selectedOrder.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Status</span>
                    <span className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase mt-1 ${
                      selectedOrder.status === "delivered" ? "bg-green-50 text-green-600 border border-green-100" :
                      selectedOrder.status === "cancelled" ? "bg-red-50 text-red-600 border border-red-100" :
                      "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse"
                    }`}>
                      {selectedOrder.status}
                    </span>
                    {selectedOrder.status === "cancelled" && selectedOrder.cancel_reason && (
                      <span className="block text-[10px] font-bold text-red-500 mt-1">
                        Reason: {selectedOrder.cancel_reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Customer Details</h4>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-700">{selectedOrder.customer}</span>
                      {selectedOrder.phone && (
                        <a href={`tel:${selectedOrder.phone}`} className="text-primary font-bold hover:underline">
                          📞 {selectedOrder.phone}
                        </a>
                      )}
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed">
                      📍 {selectedOrder.address}
                    </p>
                    {selectedOrder.lat && selectedOrder.lon && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.lat},${selectedOrder.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-primary hover:underline pt-1"
                      >
                        🗺️ View Directions on Google Maps
                      </a>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Items Ordered</h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                      selectedOrder.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white flex justify-between items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`font-extrabold text-slate-800 truncate text-[11px] ${item.is_cancelled ? "line-through text-slate-400" : ""}`}>{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}
                              {item.products?.weight ? ` (${item.products.weight})` : ""}
                              {item.is_cancelled && (
                                <span className="text-red-500 font-black ml-1.5">
                                  [Cancelled: {item.cancel_reason || "Out of Stock"}]
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!item.is_cancelled && selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelPrompt({
                                    orderId: selectedOrder.db_id,
                                    itemId: item.id
                                  });
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[9px] px-2 py-1 rounded transition-all cursor-pointer"
                              >
                                Cancel Item
                              </button>
                            )}
                            <span className={`font-black text-[11px] ${item.is_cancelled ? "line-through text-slate-350" : "text-slate-900"}`}>
                              ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-slate-455 text-xs italic">No items listed</p>
                    )}
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Bill Details</h4>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
                      <span>Items Subtotal</span>
                      <span>₹{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 ? (
                      <div className="flex justify-between items-center font-bold text-emerald-600 text-[11px]">
                        <span>Coupon Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ""}</span>
                        <span>-₹{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center font-bold text-slate-600 text-[11px]">
                      <span>Delivery Fee</span>
                      <span>₹{(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2.5 flex justify-between items-center font-black text-slate-900 text-sm">
                      <span>Total Paid ({selectedOrder.payment_method?.toUpperCase()})</span>
                      <span className="text-primary">₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Notes */}
                {selectedOrder.delivery_notes && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Delivery Notes</h4>
                    <p className="italic text-slate-550 font-semibold bg-amber-50/30 border border-amber-100/50 p-3 rounded-xl">
                      "{selectedOrder.delivery_notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer (Action Panel) */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Actions</span>
                  <div className="flex gap-2 flex-1 justify-end">
                    {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelPrompt({ orderId: selectedOrder.db_id });
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                    {getNextStatusAction(selectedOrder)}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Realtime Order Alert Overlay */}
      <AnimatePresence>
        {showFullScreenNotification && incomingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-premium border border-slate-100 p-8 text-center space-y-6"
            >
              <div className="mx-auto bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center animate-bounce">
                <Bell className="h-8 w-8 text-amber-600 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
                  New Order Received!
                </span>
                <h2 className="text-2xl font-black text-slate-950 pt-2">
                  Order #{incomingOrder.id}
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Amount Payable: <span className="text-primary font-black">₹{incomingOrder.total}</span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-2.5 text-xs font-semibold text-slate-700 max-h-[35vh] overflow-y-auto">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Customer</span>
                  <span className="text-slate-800 font-bold">{incomingOrder.customer}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Delivery Address</span>
                  <span className="text-slate-600 font-medium leading-normal block pt-0.5">{incomingOrder.address}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Time Slot / Notes</span>
                  <span className="text-slate-600 font-medium block pt-0.5">{incomingOrder.notes}</span>
                </div>

                {/* Items Ordered section inside the fullscreen modal */}
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Items Ordered</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {incomingOrder.order_items && incomingOrder.order_items.length > 0 ? (
                      incomingOrder.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center gap-2.5">
                          <div className="min-w-0 flex-1">
                            <p className={`font-extrabold text-[11px] truncate ${item.is_cancelled ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}
                              {item.products?.weight ? ` (${item.products.weight})` : ""}
                              {item.is_cancelled && (
                                <span className="text-red-500 font-black ml-1.5">
                                  [Cancelled: {item.cancel_reason || "Out of Stock"}]
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!item.is_cancelled && incomingOrder.status !== "cancelled" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelPrompt({
                                    orderId: incomingOrder.db_id,
                                    itemId: item.id
                                  });
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[9px] px-2 py-1 rounded transition-all cursor-pointer"
                              >
                                Cancel Item
                              </button>
                            )}
                            <span className={`font-black text-[11px] ${item.is_cancelled ? "line-through text-slate-350" : "text-slate-900"}`}>
                              ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-2.5 text-slate-400 text-xs italic">No items listed</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(incomingOrder.db_id, "confirmed");
                    setIncomingOrdersQueue((prev) => {
                      const nextQueue = prev.filter((o) => o.db_id !== incomingOrder.db_id);
                      if (nextQueue.length === 0) {
                        setShowFullScreenNotification(false);
                      }
                      return nextQueue;
                    });
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm py-3.5 rounded-button shadow-premium cursor-pointer transition-colors duration-150"
                >
                  Accept & Manage Order
                </button>
                {incomingOrder.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      setCancelPrompt({
                        orderId: incomingOrder.db_id
                      });
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs py-2.5 rounded-button cursor-pointer transition-colors"
                  >
                    Cancel Entire Order
                  </button>
                )}
                {incomingOrder.status === "cancelled" && (
                  <div className="text-red-650 bg-red-50 border border-red-100 p-2.5 rounded-xl text-[10px] font-extrabold">
                    ✕ Order Cancelled: {incomingOrder.cancel_reason || "All items cancelled"}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Prompt Modal Overlay */}
      <AnimatePresence>
        {cancelPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-105 p-5 space-y-4 text-slate-800 text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {cancelPrompt.itemId ? "Cancel Item" : "Cancel Order"}
                </h3>
                <button
                  onClick={() => {
                    setCancelPrompt(null);
                    setCancelReasonInput("");
                  }}
                  className="text-slate-400 hover:text-slate-650 font-extrabold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  Select Reason for Cancellation
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Out of Stock / Item Unavailable",
                    "Damaged Product",
                    "Customer Request",
                    "Delivery Partner Unavailable",
                    "Store Closing Soon",
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setCancelReasonInput(reason)}
                      className={`text-left p-3 rounded-xl border text-[11px] font-bold transition-all duration-150 ${
                        cancelReasonInput === reason
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    Or enter custom reason
                  </label>
                  <input
                    type="text"
                    placeholder="Type custom reason here..."
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setCancelPrompt(null);
                    setCancelReasonInput("");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!cancelReasonInput.trim()) {
                      alert("Please select or enter a cancellation reason.");
                      return;
                    }
                    if (cancelPrompt.itemId) {
                      handleCancelItem(cancelPrompt.orderId, cancelPrompt.itemId, cancelReasonInput.trim());
                    } else {
                      handleCancelOrder(cancelPrompt.orderId, cancelReasonInput.trim());
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-sm"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Loading admin panel...</p>
      </div>
    }>
      <AdminPanelContent />
    </Suspense>
  );
}
