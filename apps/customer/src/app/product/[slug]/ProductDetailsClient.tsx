"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Heart, Plus, Minus, ArrowLeft, ShieldCheck, ShoppingCart, Leaf, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import ProductCard, { Product } from "@/components/ProductCard";
import FooterNav from "@/components/FooterNav";
import { useCart } from "@/context/CartContext";
import { useData } from "@/context/DataContext";



// High quality mock description/nutrition/benefits for product page lookup
const detailMetadata: Record<
  string,
  {
    nutrition: Record<string, string>;
    origin: string;
    shelf_life: string;
    benefits: string[];
  }
> = {
  "royal-gala-apple": {
    nutrition: { Calories: "95 kcal", Carbohydrates: "25g", Fiber: "4.4g", "Vitamin C": "14%" },
    origin: "New Zealand",
    shelf_life: "Up to 14 days stored in refrigerator.",
    benefits: [
      "Rich in dietary fiber which aids in healthy digestion.",
      "High Vitamin C content boosts the immune system.",
      "Contains antioxidants that protect cardiovascular health.",
    ],
  },
  "organic-banana": {
    nutrition: { Calories: "105 kcal", Potassium: "422mg", "Vitamin B6": "33%", Fiber: "3g" },
    origin: "Karnataka, India",
    shelf_life: "3-5 days in cool dry place.",
    benefits: [
      "Excellent natural energy booster for active people.",
      "High potassium supports strong blood pressure regulation.",
      "Contains prebiotics that feed good gut bacteria.",
    ],
  },
  "alphonso-mango": {
    nutrition: { Calories: "201 kcal", "Vitamin A": "36%", "Vitamin C": "100%", Potassium: "325mg" },
    origin: "Devgad, Maharashtra, India",
    shelf_life: "2-4 days when fully ripe.",
    benefits: [
      "Rich in Vitamin A which helps guard eyes and eyesight.",
      "Extremely rich in Vitamin C for healthy glowing skin.",
      "Provides enzymes that help break down proteins easily.",
    ],
  },
  "hybrid-tomato": {
    nutrition: { Calories: "22 kcal", Water: "95%", Lycopene: "High", Carbohydrates: "4g" },
    origin: "Local Farm greenhouse, India",
    shelf_life: "4-7 days at room temperature.",
    benefits: [
      "High in Lycopene, a powerful antioxidant that protects skin.",
      "Low calorie and low carb, perfect for weight management.",
      "Great source of Folate which helps in cellular growth.",
    ],
  },
  "red-onion": {
    nutrition: { Calories: "44 kcal", Fiber: "1.9g", "Vitamin C": "12%", Calcium: "2%" },
    origin: "Nashik, Maharashtra, India",
    shelf_life: "Up to 30 days stored in cool, dark, dry bins.",
    benefits: [
      "Contains organosulfur compounds that lower blood pressure.",
      "High in antioxidants like quercetin which reduces inflammation.",
      "Excellent base for gut-friendly prebiotic fiber.",
    ],
  },
  "premium-potato": {
    nutrition: { Calories: "110 kcal", Carbohydrates: "26g", Potassium: "15%", "Vitamin B6": "10%" },
    origin: "Punjab Farms, India",
    shelf_life: "Up to 20 days stored in dry cool darkness.",
    benefits: [
      "Provides complex carbohydrates for slow and sustained energy.",
      "Naturally gluten-free and extremely easy to digest.",
      "Contains vitamin B6 which supports brain cell health.",
    ],
  },
  "fresh-spinach": {
    nutrition: { Calories: "7 kcal", Iron: "15%", Calcium: "8%", "Vitamin A": "120%" },
    origin: "Local Greenhouses, India",
    shelf_life: "2-3 days in refrigerator crisper.",
    benefits: [
      "Contains high levels of Iron to help boost blood hemoglobin.",
      "Rich in lutein and zeaxanthin which protect eye retina.",
      "High in Calcium and Vitamin K for bone development.",
    ],
  },
  "organic-avocado": {
    nutrition: { Calories: "240 kcal", Fat: "22g", Fiber: "10g", Potassium: "485mg" },
    origin: "Michoacán, Mexico",
    shelf_life: "3-5 days. Ripens on kitchen counter.",
    benefits: [
      "Contains healthy monounsaturated fats that lower bad cholesterol.",
      "High fiber content helps you feel full and satisfied.",
      "Has more potassium than standard bananas.",
    ],
  },
  "fresh-strawberry": {
    nutrition: { Calories: "64 kcal", "Vitamin C": "140%", Fiber: "3g", Potassium: "220mg" },
    origin: "Mahabaleshwar, Maharashtra, India",
    shelf_life: "2-4 days in refrigerator.",
    benefits: [
      "Loaded with antioxidants that benefit heart and arteries.",
      "Excellent source of Vitamin C to synthesize skin collagen.",
      "Helps regulate blood sugar response.",
    ],
  },
  "exotic-broccoli": {
    nutrition: { Calories: "31 kcal", Protein: "2.5g", "Vitamin C": "115%", Calcium: "4%" },
    origin: "Ooty, Tamil Nadu, India",
    shelf_life: "4-6 days in refrigerator.",
    benefits: [
      "Contains glucosinolates, known to fight cellular aging.",
      "Supports liver function and natural detoxification systems.",
      "High fiber helps optimize gut microbiome.",
    ],
  },
};

export default function ProductDetails() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { products: productsList, dbLoading } = useData();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  const { cart, addToCart } = useCart();
  const cartItem = cart.find((item) => item.product.id === product?.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  useEffect(() => {
    if (!dbLoading && productsList.length > 0) {
      const match = productsList.find((p) => p.slug === slug);
      if (match) {
        setProduct(match);
      }
    }
  }, [slug, productsList, dbLoading]);

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Retrieving product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <span className="text-4xl mb-4">🍅</span>
        <h2 className="text-xl font-bold text-slate-800">Product not found</h2>
        <Link href="/">
          <button className="mt-4 bg-primary text-white font-bold px-6 py-2.5 rounded-button shadow-premium">
            Back to Shop
          </button>
        </Link>
      </div>
    );
  }

  // Lookup details metadata: Prefer DB values, then check detailMetadata, then use final fallback
  const dbBenefits = (product as any).benefits;
  const dbNutrition = (product as any).nutrition;
  const dbOrigin = (product as any).origin;
  const dbShelf = (product as any).shelf_life;

  const defaultMeta = detailMetadata[product.slug] || {
    nutrition: { Calories: "45 kcal", Fiber: "2g", "Vitamin C": "10%" },
    origin: "Local Farm",
    shelf_life: "3-5 days in cool storage.",
    benefits: ["Sourced fresh from local growers.", "Rich in natural vitamins and dietary fiber.", "Guaranteed fresh delivery."],
  };

  const meta = {
    benefits: dbBenefits && dbBenefits.length > 0 ? dbBenefits : defaultMeta.benefits,
    nutrition: dbNutrition && Object.keys(dbNutrition).length > 0 ? dbNutrition : defaultMeta.nutrition,
    origin: dbOrigin || defaultMeta.origin,
    shelf_life: dbShelf || defaultMeta.shelf_life,
  };

  const relatedProducts = productsList.filter(
    (p) => p.category_id === product.category_id && p.id !== product.id
  );

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 py-3.5 px-4 flex items-center justify-between shadow-sm">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" /> Back
        </button>
        <span className="text-xs font-black text-slate-800 truncate max-w-[200px]">
          {product.name}
        </span>
        <div className="w-12" />
      </div>

      {/* Desktop Sticky Sub-Header */}
      <div className="hidden md:flex sticky top-[73px] z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 py-3 px-8 items-center justify-between shadow-sm">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </button>
        <span className="text-sm font-bold text-slate-800">
          {product.name}
        </span>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">

        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 bg-card p-6 md:p-10 rounded-xl shadow-card border border-slate-100/80">
          {/* Left Column: Image & Badges */}
          <div className="space-y-4">
            <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">

              <button
                onClick={() => setIsLiked(!isLiked)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white shadow hover:bg-red-50 border border-slate-100 z-10 transition-colors duration-150"
              >
                <Heart
                  className={`h-5 w-5 transition-transform duration-200 active:scale-75 ${
                    isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
                  }`}
                />
              </button>

              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
                priority
              />
            </div>
          </div>

          {/* Right Column: Title, Prices, Quantity, Specs */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase tracking-wider bg-primary/10 w-fit px-3 py-1 rounded-full">
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400 border-none" />
                Delivery in {product.delivery_time}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                {product.name}
              </h1>

              <p className="text-sm font-semibold text-slate-500">{product.weight}</p>

              {/* Price Details */}
              <div className="flex items-end gap-3 pt-2">
                <span className="text-3xl font-black text-slate-900">₹{product.price}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-lg text-slate-400 line-through pb-0.5">
                      ₹{product.original_price}
                    </span>
                    <span className="text-xs font-extrabold text-primary bg-primary-light/10 px-2 py-1 rounded-lg mb-1">
                      {product.discount.toFixed(0)}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Stock status indicator */}
              <div className="text-xs font-bold pt-1">
                {product.stock > 0 ? (
                  product.stock <= 5 ? (
                    <span className="text-amber-600">Only {product.stock} left in stock!</span>
                  ) : (
                    <span className="text-emerald-600">In Stock</span>
                  )
                ) : (
                  <span className="text-red-500">Out of Stock</span>
                )}
              </div>
            </div>

            {/* Cart Button Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
              {product.stock > 0 ? (
                quantity === 0 ? (
                  <button
                     onClick={() => addToCart(product, 1)}
                     className="flex-1 max-w-xs bg-primary hover:bg-primary-dark text-white font-extrabold px-6 py-4 rounded-button shadow-premium transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    ADD TO CART
                  </button>
                ) : (
                  <div className="flex items-center justify-between w-36 bg-primary text-white font-extrabold py-3 px-4 rounded-button shadow-premium">
                    <button onClick={() => addToCart(product, quantity - 1)} className="hover:scale-110 active:scale-95 transition-transform p-1">
                      <Minus className="h-4.5 w-4.5" />
                    </button>
                    <span>{quantity}</span>
                    <button
                      onClick={() => addToCart(product, quantity + 1)}
                      disabled={quantity >= product.stock}
                      className="hover:scale-110 active:scale-95 transition-transform p-1 disabled:opacity-50"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )
              ) : (
                <button disabled className="flex-1 max-w-xs bg-slate-200 text-slate-400 font-bold px-6 py-4 rounded-button cursor-not-allowed">
                  SOLD OUT
                </button>
              )}
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600 mt-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>100% Quality Assured</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span>Chemical Free Farms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Meta Section: Tabs/Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Benefits */}
          <div className="bg-card p-6 rounded-xl shadow-card border border-slate-100/80 space-y-4 md:col-span-2">
            <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">
              Health Benefits
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 list-disc pl-4 leading-relaxed font-medium">
              {meta.benefits.map((benefit: string, idx: number) => (
                <li key={idx}>{benefit}</li>
              ))}
            </ul>
          </div>

          {/* Details Table */}
          <div className="bg-card p-6 rounded-xl shadow-card border border-slate-100/80 space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">
              Details & Nutrition
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-bold">
                <span className="text-slate-400">Origin</span>
                <span className="text-slate-700">{meta.origin}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-bold">
                <span className="text-slate-400">Shelf Life</span>
                <span className="text-slate-700">{meta.shelf_life}</span>
              </div>
              <div className="space-y-1.5 pt-2">
                <span className="text-slate-400 font-bold block mb-1">Nutrition Facts (per 100g)</span>
                {Object.entries(meta.nutrition).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center font-semibold text-[11px] text-slate-600">
                    <span>{key}</span>
                    <span>{val as any}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Suggested products section */}
        {relatedProducts.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800">
              Suggested Products
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedProducts.slice(0, 5).map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>
        )}
      </main>

      <FooterNav />
    </div>
  );
}
