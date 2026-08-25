import ProductDetailsClient from "./ProductDetailsClient";
import { createClient } from "@/lib/supabase/client";

const mockSlugs = [
  "royal-gala-apple",
  "organic-banana",
  "alphonso-mango",
  "hybrid-tomato",
  "red-onion",
  "premium-potato",
  "fresh-spinach",
  "organic-avocado",
  "fresh-strawberry",
  "exotic-broccoli"
];

export async function generateStaticParams() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient();
      const { data } = await supabase.from("products").select("slug").eq("is_hidden", false);
      if (data && data.length > 0) {
        const slugs = data.map((p: any) => p.slug).filter(Boolean);
        if (slugs.length > 0) {
          const uniqueSlugs = Array.from(new Set([...mockSlugs, ...slugs]));
          return uniqueSlugs.map((slug) => ({ slug }));
        }
      }
    }
  } catch (error) {
    console.warn("Could not fetch slugs from Supabase during generateStaticParams, falling back to mock slugs:", error);
  }

  return mockSlugs.map((slug) => ({ slug }));
}

export default function ProductPage() {
  return <ProductDetailsClient />;
}
