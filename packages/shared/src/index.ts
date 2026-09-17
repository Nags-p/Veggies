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
