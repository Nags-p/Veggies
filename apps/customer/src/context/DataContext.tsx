"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/components/ProductCard";

interface Order {
  id: string;
  displayId: string;
  date: string;
  items: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  address: string;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  coupon_code: string | null;
  delivery_notes: string | null;
  order_items: any[];
  cancel_reason?: string | null;
}

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

interface DataContextType {
  products: Product[];
  categories: any[];
  orders: Order[];
  profile: Profile | null;
  addresses: Address[];
  wishlist: string[];
  dbLoading: boolean;
  ordersLoading: boolean;
  profileLoading: boolean;
  refreshProducts: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  updateProfileLocal: (updated: Partial<Profile>) => void;
  setDbOrdersLocal: React.Dispatch<React.SetStateAction<Order[]>>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const [dbLoading, setDbLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch products and categories
  const fetchProductsAndCategories = async () => {
    try {
      const { data: catData } = await supabase.from("categories").select("*").order("name");
      const { data: prodData } = await supabase.from("products").select("*").eq("is_hidden", false);

      if (prodData) {
        const mappedProducts = prodData.map((p: any) => ({
          id: p.id,
          category_id: p.category_id,
          name: p.name,
          slug: p.slug,
          price: parseFloat(p.price),
          original_price: parseFloat(p.original_price),
          discount: parseFloat(p.discount),
          weight: p.weight,
          stock: p.stock,
          delivery_time: p.delivery_time,
          images: p.images || [],
          is_organic: p.is_organic,
          is_seasonal: p.is_seasonal,
          is_exotic: p.is_exotic,
          origin: p.origin,
          shelf_life: p.shelf_life,
          benefits: p.benefits,
          nutrition: p.nutrition,
        }));
        setProducts(mappedProducts);

        if (catData) {
          const iconMap: Record<string, string> = {
            "fresh-fruits": "🍎",
            "fresh-vegetables": "🥦",
            "leafy-vegetables": "🥬",
            "organic-greens": "🌱",
            "seasonal-delights": "🍓",
            "exotic-veggies": "🥑",
          };
          const catImages: Record<string, string> = {
            "fresh-fruits": "/images/categories/fresh-fruits.jpg",
            "fresh-vegetables": "/images/categories/fresh-vegetables.jpg",
            "organic-greens": "/images/categories/organic-greens.jpg",
            "leafy-vegetables": "/images/categories/leafy-vegetables.jpg",
            "seasonal-delights": "/images/categories/seasonal-delights.jpg",
            "exotic-veggies": "/images/categories/exotic-veggies.jpg"
          };
          const mappedCats = catData.map((c: any) => {
            const count = mappedProducts.filter((p: any) => p.category_id === c.id).length;
            return {
              id: c.id,
              name: c.name,
              slug: c.slug,
              icon: iconMap[c.slug] || "🥦",
              imageUrl: catImages[c.slug] || "/images/categories/fresh-vegetables.jpg",
              dbCategoryId: c.id,
              count: `${count} ${count === 1 ? 'item' : 'items'}`,
              itemCountValue: count
            };
          }).filter((c) => c.itemCountValue > 0);
          const finalCats = [
            {
              id: "all",
              name: "All",
              slug: "all",
              icon: "🥦",
              imageUrl: "/images/categories/fresh-vegetables.jpg",
              dbCategoryId: null,
              count: `${mappedProducts.length} items`
            },
            ...mappedCats
          ];
          setCategories(finalCats);
        }
      }
    } catch (err) {
      console.error("Failed to load products/categories:", err);
    } finally {
      setDbLoading(false);
    }
  };

  // Fetch user profile and addresses
  const fetchProfileAndAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setAddresses([]);
        setProfileLoading(false);
        return;
      }

      // Fetch profile details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        // Fallback profile details
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || "Customer",
          phone: user.user_metadata?.phone || null,
          email: user.email || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: user.user_metadata?.role || "customer",
          created_at: user.created_at,
        });
      }

      // Fetch addresses
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .eq("profile_id", user.id);
      if (addressData) {
        setAddresses(addressData);
      }
    } catch (err) {
      console.error("Failed to load profile/addresses:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch orders history
  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrders([]);
        setOrdersLoading(false);
        return;
      }

      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(weight)), addresses(*)")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const mappedOrders = data.map((o: any) => {
          const itemsStr = o.order_items
            ? o.order_items.map((item: any) => {
                const weightStr = item.products?.weight ? ` (${item.products.weight})` : "";
                const cancelStr = item.is_cancelled ? " [Cancelled]" : "";
                return `${item.name}${weightStr}${cancelStr} (x${item.quantity})`;
              }).join(", ")
            : "No items listed";

          return {
            id: o.id,
            displayId: o.id.slice(0, 8).toUpperCase(),
            date: new Date(o.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            }),
            items: itemsStr,
            total: parseFloat(o.net_amount),
            status: o.status,
            payment_method: o.payment_method,
            payment_status: o.payment_status,
            address: o.addresses 
              ? `${o.addresses.building_name}, ${o.addresses.complete_address}`
              : "Saved Address",
            discount_amount: parseFloat(o.discount_amount),
            delivery_fee: parseFloat(o.delivery_fee),
            total_amount: parseFloat(o.total_amount),
            coupon_code: o.coupon_code,
            delivery_notes: o.delivery_notes,
            cancel_reason: o.cancel_reason,
            order_items: o.order_items || []
          };
        });

        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch wishlist favorites
  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWishlist([]);
        return;
      }
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("profile_id", user.id);

      if (error) throw error;
      if (data) {
        setWishlist(data.map((item: any) => item.product_id));
      }
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    }
  };

  // Add/Remove from wishlist
  const toggleWishlist = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to add products to your wishlist");
        return;
      }

      const isWishlisted = wishlist.includes(productId);

      if (isWishlisted) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("profile_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;
        setWishlist((prev) => prev.filter((id) => id !== productId));
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({
            profile_id: user.id,
            product_id: productId
          });

        if (error) throw error;
        setWishlist((prev) => [...prev, productId]);
      }
    } catch (err: any) {
      console.error("Failed to update wishlist:", err);
      alert(err.message || "Failed to update wishlist");
    }
  };

  useEffect(() => {
    // Initial fetch of public database content
    fetchProductsAndCategories();
    // Initial fetch of authenticated content
    fetchProfileAndAddresses();
    fetchOrders();
    fetchWishlist();

    // Listen for auth state changes to reload user data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        fetchProfileAndAddresses();
        fetchOrders();
        fetchWishlist();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setAddresses([]);
        setOrders([]);
        setWishlist([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateProfileLocal = (updatedFields: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  return (
    <DataContext.Provider
      value={{
        products,
        categories,
        orders,
        profile,
        addresses,
        wishlist,
        dbLoading,
        ordersLoading,
        profileLoading,
        refreshProducts: fetchProductsAndCategories,
        refreshOrders: fetchOrders,
        refreshProfile: fetchProfileAndAddresses,
        refreshWishlist: fetchWishlist,
        updateProfileLocal,
        setDbOrdersLocal: setOrders,
        toggleWishlist
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
