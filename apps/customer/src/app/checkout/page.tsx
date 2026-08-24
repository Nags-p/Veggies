"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Tag, CreditCard, ChevronRight, ShieldAlert, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import { useLocation } from "@/context/LocationContext";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/context/StoreContext";

// Store coordinates: Veggies Main Shop
const STORE_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "12.971598");
const STORE_LON = parseFloat(process.env.NEXT_PUBLIC_STORE_LON || "77.594562");

// Haversine formula to compute distance in KM
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const timeSlots = [
  "Immediate (10 Mins)",
  "Morning Slot (08:00 AM - 11:00 AM)",
  "Afternoon Slot (12:00 PM - 03:00 PM)",
  "Evening Slot (05:00 PM - 08:00 PM)",
];

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { cart, subtotal, savings, deliveryFee, netAmount, clearCart } = useCart();
  const { location, isServiceable, setShowLocationModal } = useLocation();
  const { isStoreOpen, storeTimings } = useStore();

  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/checkout");
      } else {
        setAuthLoading(false);
      }
    }
    checkUser();
  }, [router, supabase.auth]);

  // Read coordinates and address line 2 dynamically from context
  const lat = location?.lat.toFixed(6) || STORE_LAT.toFixed(6);
  const lon = location?.lon.toFixed(6) || STORE_LON.toFixed(6);
  const addressLine2 = location?.complete_address || location?.address || "";

  const [selectedSlot, setSelectedSlot] = useState(timeSlots[0]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "online">("COD");
  const [loading, setLoading] = useState(false);
  const [radiusError, setRadiusError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-slate-500 mt-2">Securing checkout session...</p>
      </div>
    );
  }

  // Apply Coupon Logic
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const codeUpper = couponCode.trim().toUpperCase();

    if (codeUpper === "VEGGIES100") {
      if (subtotal < 499) {
        setCouponError("Min order value for VEGGIES100 is ₹499");
      } else {
        setAppliedCoupon({ code: "VEGGIES100", discount: 100 });
      }
    } else if (codeUpper === "FRESH20") {
      if (subtotal < 299) {
        setCouponError("Min order value for FRESH20 is ₹299");
      } else {
        const disc = Math.min(subtotal * 0.2, 80);
        setAppliedCoupon({ code: "FRESH20", discount: disc });
      }
    } else if (codeUpper === "WELCOME50") {
      if (subtotal < 199) {
        setCouponError("Min order value for WELCOME50 is ₹199");
      } else {
        setAppliedCoupon({ code: "WELCOME50", discount: 50 });
      }
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  const handlePlaceOrder = async () => {
    setRadiusError(null);

    // Coordinate verification (2 KM Delivery Radius validation)
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      setRadiusError("Please enter valid latitude and longitude coordinates.");
      return;
    }

    const distance = getDistanceInKm(STORE_LAT, STORE_LON, latitude, longitude);

    if (distance > 2.0) {
      setRadiusError(
        `Delivery address is ${distance.toFixed(2)} KM away, which exceeds our maximum delivery radius of 2 KM.`
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Get authenticated user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRadiusError("Your session has expired. Please log in again.");
        router.push("/login?redirect=/checkout");
        return;
      }

      // 2. Check if an identical address already exists for this user
      let addrId = location?.id || null;

      if (!addrId) {
        const buildingName = location?.building_name || location?.address.split(",")[0] || "Saved Address";
        const completeAddress = location?.complete_address || location?.address || "";

        // Look up by coordinates and fields to prevent duplicate entry
        const { data: existingAddr, error: findErr } = await supabase
          .from("addresses")
          .select("id")
          .eq("profile_id", user.id)
          .eq("building_name", buildingName)
          .eq("complete_address", completeAddress)
          .eq("latitude", latitude)
          .eq("longitude", longitude)
          .maybeSingle();

        if (existingAddr) {
          addrId = existingAddr.id;
        } else {
          // Insert new address
          const { data: addrData, error: addrErr } = await supabase
            .from("addresses")
            .insert({
              profile_id: user.id,
              name: "Home",
              building_name: buildingName,
              complete_address: completeAddress,
              latitude: latitude,
              longitude: longitude,
              is_default: true
            })
            .select()
            .single();

          if (addrErr || !addrData) {
            console.error("Address insert error:", addrErr);
            setRadiusError("Failed to save delivery address in database.");
            setLoading(false);
            return;
          }
          addrId = addrData.id;
        }
      }

      // 3. Insert order header into public.orders
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
          profile_id: user.id,
          address_id: addrId,
          status: "pending", // matches lowercase DB constraint
          total_amount: subtotal,
          discount_amount: currentCouponDiscount,
          delivery_fee: deliveryFee,
          net_amount: finalPayable,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "online" ? "paid" : "pending",
          coupon_code: appliedCoupon?.code || null,
          delivery_notes: selectedSlot,
          estimated_delivery_time: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins from now
        })
        .select()
        .single();

      if (orderErr || !orderData) {
        console.error("Order insert error:", orderErr);
        setRadiusError("Failed to create order in database.");
        setLoading(false);
        return;
      }

      // 4. Insert items into public.order_items
      const orderItemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id.length < 10 ? null : item.product.id, // Bypass UUID check for mock text IDs like 'p1'
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image_url: item.product.images?.[0] || ""
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItemsToInsert);

      if (itemsErr) {
        console.error("Order items insert error:", itemsErr);
      }

      setLoading(false);
      // Reset Cart
      clearCart();
      // Redirect to success route
      router.push(`/orders/track?id=${orderData.id}&success=true`);
    } catch (err) {
      console.error("Checkout order placement failed:", err);
      setRadiusError("An unexpected error occurred while placing order.");
      setLoading(false);
    }
  };

  const currentCouponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalPayable = Math.max(netAmount - currentCouponDiscount, 0);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-100 py-3.5 px-4 flex items-center justify-between shadow-sm">
        <Link href="/cart">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 cursor-pointer">
            <ArrowLeft className="h-4.5 w-4.5" /> Back
          </span>
        </Link>
        <span className="text-xs font-black text-slate-800">Secure Checkout</span>
        <div className="w-12" />
      </div>

      {/* Desktop Sticky Sub-Header */}
      <div className="hidden md:flex sticky top-[73px] z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 py-3 px-8 items-center justify-between shadow-sm">
        <Link href="/cart">
          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Back to Cart
          </span>
        </Link>
        <span className="text-sm font-bold text-slate-850">Checkout</span>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">

        <h1 className="text-2xl font-extrabold text-slate-900">Secure Checkout</h1>

        {radiusError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 flex gap-3 items-start"
          >
            <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold">Delivery Out of Bounds</p>
              <p className="text-red-700 font-medium leading-relaxed">{radiusError}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Form Sections */}
          <div className="md:col-span-2 space-y-6">
            {/* Delivery Address Details */}
            <div className="bg-card p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold text-slate-800">Delivery Location</h3>
              </div>
              <div className="space-y-4">
                {/* Pinned Map Address Banner */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">Saved Address</span>
                    <p className="text-xs font-bold text-slate-700 leading-snug">{addressLine2 || "No location selected. Please pin a location."}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="text-xs font-extrabold text-primary hover:text-primary-dark hover:underline flex-shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Time Slots */}
            <div className="bg-card p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold text-slate-800">Select Delivery Time</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {timeSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`text-left p-3.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                        isSelected
                          ? "bg-primary/5 border-primary text-primary"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-card p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold text-slate-800">Select Payment Method</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("COD")}
                  className={`text-left p-4 rounded-xl border text-xs font-bold transition-all duration-150 flex items-center justify-between ${
                    paymentMethod === "COD"
                      ? "bg-primary/5 border-primary text-primary"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-extrabold">Cash on Delivery (COD)</p>
                    <p className="text-[10px] text-slate-400 font-medium">Pay with cash or UPI at delivery</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === "COD" ? "border-primary" : "border-slate-300"}`}>
                    {paymentMethod === "COD" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod("online")}
                  className={`text-left p-4 rounded-xl border text-xs font-bold transition-all duration-150 flex items-center justify-between ${
                    paymentMethod === "online"
                      ? "bg-primary/5 border-primary text-primary"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-extrabold">Mock Online Payment</p>
                    <p className="text-[10px] text-slate-400 font-medium">Credit/Debit cards, Net Banking, UPI</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === "online" ? "border-primary" : "border-slate-300"}`}>
                    {paymentMethod === "online" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Bill Summary */}
          <div className="space-y-4">
            {/* Promo Codes */}
            <div className="bg-card p-5 rounded-xl shadow-card border border-slate-100/80 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                <Tag className="h-4.5 w-4.5 text-primary" /> Promo Coupons
              </div>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Code e.g. FRESH20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold placeholder-slate-400 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-4 py-2 rounded-button shadow-sm"
                >
                  APPLY
                </button>
              </form>

              {couponError && (
                <p className="text-[10px] font-bold text-red-600">{couponError}</p>
              )}

              {appliedCoupon && (
                <div className="bg-green-50 text-primary border border-green-100 rounded-xl p-2.5 text-xs font-bold flex justify-between items-center">
                  <span>Coupon {appliedCoupon.code} applied!</span>
                  <span>-₹{appliedCoupon.discount}</span>
                </div>
              )}

              <div className="pt-2 text-[10px] text-slate-400 space-y-1 font-semibold">
                <p>Available Coupons:</p>
                <ul className="list-disc pl-3">
                  <li>WELCOME50 (Save ₹50, min ₹199)</li>
                  <li>FRESH20 (Save 20% up to ₹80, min ₹299)</li>
                  <li>VEGGIES100 (Save ₹100, min ₹499)</li>
                </ul>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-card p-5 rounded-xl shadow-card border border-slate-100/80 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">
                Order Summary
              </h3>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Items Subtotal</span>
                  <span className="text-slate-800">₹{subtotal}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Product Savings</span>
                    <span>-₹{savings}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Delivery Charge</span>
                  {deliveryFee === 0 ? (
                    <span className="text-primary font-bold">FREE</span>
                  ) : (
                    <span className="text-slate-800">₹{deliveryFee}</span>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-primary">
                    <span>Promo Coupon Discount</span>
                    <span>-₹{appliedCoupon.discount}</span>
                  </div>
                )}

                <div className="pt-3.5 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Amount Payable</span>
                  <span className="text-lg">₹{finalPayable}</span>
                </div>
              </div>

              {/* Store Closed Warning */}
              {!isStoreOpen && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 flex gap-2.5 items-start text-xs text-red-700 font-bold mb-4 shadow-sm">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="block font-black text-sm text-red-800">Store is Currently Closed</span>
                    <span className="block font-medium text-red-650 mt-1 leading-relaxed">
                       Timings: {storeTimings?.open_time || "08:00"} - {storeTimings?.close_time || "22:00"} ({storeTimings?.days || "Mon - Sun"}).
                    </span>
                    <span className="block font-medium text-red-500 mt-1">Please place orders during open hours.</span>
                  </div>
                </div>
              )}

              {/* Order Button CTA */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || cart.length === 0 || !isStoreOpen}
                className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-4 px-4 rounded-button shadow-premium transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    Confirm & Place Order <ChevronRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <FooterNav />
    </div>
  );
}
