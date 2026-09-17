import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

export type Role = "customer" | "staff" | "delivery" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "arrived"
  | "delivered"
  | "cancelled";

export type Profile = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role: Role;
  created_at?: string;
};

export type Product = {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price: number;
  discount: number;
  weight: string;
  stock: number;
  delivery_time: string;
  images: string[];
  is_organic?: boolean;
  is_seasonal?: boolean;
  is_exotic?: boolean;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  is_packed?: boolean;
  is_unavailable?: boolean;
};

export type Order = {
  id: string;
  profile_id: string;
  address_id?: string | null;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number;
  delivery_fee: number;
  net_amount: number;
  payment_method: "COD" | "online";
  payment_status: "pending" | "paid" | "failed";
  coupon_code?: string | null;
  delivery_notes?: string | null;
  estimated_delivery_time?: string | null;
  packer_name?: string | null;
  delivery_partner_id?: string | null;
  delivery_otp?: string | null;
  cod_collected?: boolean;
  cancel_reason?: string | null;
  packed_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  customer?: Profile | null;
  address?: {
    name: string;
    building_name: string;
    complete_address: string;
    latitude: number;
    longitude: number;
  } | null;
  order_items?: OrderItem[];
};

export type StoreStaffCode = {
  id: string;
  store_name: string;
  access_code: string;
  is_active: boolean;
  created_by?: string | null;
  last_used_at?: string | null;
  created_at: string;
};

// Staff Session stored locally on shared store device
export type StaffSession = {
  store_code: string;
  store_name: string;
  staff_name: string;
  login_time: string;
};

export type Store = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  radius_km: number;
  phone?: string;
  is_active: boolean;
  staff_code?: string;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_STORES: Store[] = [
  {
    id: "store-indiranagar",
    name: "Veggies Flagship Store (Indiranagar)",
    address: "12th Cross, Indiranagar, Bengaluru",
    lat: 12.9784,
    lon: 77.6408,
    radius_km: 2.0,
    phone: "+91 98765 43210",
    is_active: true,
    staff_code: "492810",
  },
  {
    id: "store-koramangala",
    name: "Veggies Express Store (Koramangala)",
    address: "5th Block, Koramangala, Bengaluru",
    lat: 12.9352,
    lon: 77.6245,
    radius_km: 2.0,
    phone: "+91 98765 43211",
    is_active: true,
    staff_code: "773901",
  },
];

export type StoreLocation = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  radius_km: number;
  phone?: string;
};

export const DEFAULT_STORE_LOCATION: StoreLocation = {
  name: "Veggies Flagship Store (Indiranagar)",
  address: "12th Cross, Indiranagar, Bengaluru",
  lat: 12.9784,
  lon: 77.6408,
  radius_km: 2.0,
  phone: "+91 98765 43210",
};

// Haversine formula to compute geodesic distance in KM
export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest store from a list of stores
export function getNearestStore(
  lat: number,
  lon: number,
  stores: (Store | StoreLocation)[]
): { store: (Store | StoreLocation) | null; distance: number; isDeliverable: boolean } {
  if (!stores || stores.length === 0) {
    return { store: null, distance: 999999, isDeliverable: false };
  }

  // Filter active stores if Store type
  const candidateStores = stores.filter((s) => ("is_active" in s ? s.is_active : true));
  if (candidateStores.length === 0) {
    return { store: null, distance: 999999, isDeliverable: false };
  }

  let nearest: (Store | StoreLocation) | null = null;
  let minDistance = Infinity;

  for (const s of candidateStores) {
    const d = getDistanceInKm(s.lat, s.lon, lat, lon);
    if (d < minDistance) {
      minDistance = d;
      nearest = s;
    }
  }

  const isDeliverable = nearest ? minDistance <= (nearest.radius_km || 2.0) : false;
  return { store: nearest, distance: minDistance, isDeliverable };
}

