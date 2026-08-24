import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return supabaseInstance;
}

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
