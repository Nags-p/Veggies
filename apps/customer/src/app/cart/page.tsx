"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, ShieldCheck, ArrowRight, MapPin, Home, Briefcase, Tag, AlertCircle, Loader2, Edit2, Locate } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import FooterNav from "@/components/FooterNav";

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    savings
  } = useCart();

  // Delivery settings
  const [deliverySettings, setDeliverySettings] = useState<any>({
    delivery_fee: 30,
    min_free_delivery_amount: 250
  });

  // User details
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState(true);

  // Address selection drawer / modal sheet
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [savingAddress, setSavingAddress] = useState(false);
  const [lat, setLat] = useState(13.0017689);
  const [lng, setLng] = useState(77.5777957);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showCouponsList, setShowCouponsList] = useState(false);

  // Payment Option
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // General checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load User, Addresses, Coupons, Settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          // Load addresses
          const { data: addrData } = await supabase
            .from("addresses")
            .select("*")
            .eq("profile_id", user.id)
            .order("is_default", { ascending: false });

          if (addrData) {
            setAddresses(addrData);
            if (addrData.length > 0) {
              setSelectedAddressId(addrData[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile addresses:", err);
      } finally {
        setAddressLoading(false);
      }

      // Load Settings
      try {
        const { data: settingData } = await supabase
          .from("store_settings")
          .select("*")
          .eq("key", "delivery_settings")
          .single();
        if (settingData && settingData.value) {
          setDeliverySettings(settingData.value);
        }
      } catch (err) {
        console.error("Failed to fetch store settings:", err);
      }

      // Load active coupons
      try {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true);
        if (couponData) {
          setCoupons(couponData);
        }
      } catch (err) {
        console.error("Failed to load coupons:", err);
      }
    }
    loadData();
  }, [supabase]);

  // Listen for iframe map coordinates and reverse-geocode them
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "LOCATION_SELECT") {
        const { lat: selectLat, lng: selectLng } = event.data;
        setLat(selectLat);
        setLng(selectLng);

        // Fetch reverse geocoded address details from OpenStreetMap
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectLat}&lon=${selectLng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const result = await res.json();
            if (result.display_name) {
              setCompleteAddress(result.display_name);
            }
          }
        } catch (err) {
          console.warn("Reverse geocoding failed:", err);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Distance helper (Haversine formula) to check store service radius (2.0 KM)
  const STORE_LAT = 13.0017689;
  const STORE_LON = 77.5777957;

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Handle inline address save (insert/update)
  const handleSaveAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId || !buildingName || !completeAddress) return;
    try {
      setSavingAddress(true);

      if (editingAddressId) {
        // UPDATE Existing Address
        const { data, error } = await supabase
          .from("addresses")
          .update({
            name: addressLabel,
            building_name: buildingName,
            complete_address: completeAddress,
            latitude: lat,
            longitude: lng,
          })
          .eq("id", editingAddressId)
          .select()
          .single();

        if (!error && data) {
          setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? data : a)));
          setSelectedAddressId(data.id);
          setShowAddressForm(false);
          setEditingAddressId(null);
          setBuildingName("");
          setCompleteAddress("");
        } else {
          console.error("Error updating address:", error);
        }
      } else {
        // CREATE New Address
        const newAddress = {
          profile_id: userId,
          name: addressLabel,
          building_name: buildingName,
          complete_address: completeAddress,
          latitude: lat,
          longitude: lng,
          is_default: addresses.length === 0
        };

        const { data, error } = await supabase
          .from("addresses")
          .insert([newAddress])
          .select()
          .single();

        if (!error && data) {
          setAddresses((prev) => [data, ...prev]);
          setSelectedAddressId(data.id);
          setShowAddressForm(false);
          setBuildingName("");
          setCompleteAddress("");
        } else {
          console.error("Error creating address:", error);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAddress(false);
    }
  };

  // Fetch current geolocation coordinates
  const handleFetchCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        
        // Post a message to Leaflet iframe map marker
        const iframe = document.getElementById("map-iframe") as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "UPDATE_COORDINATES", lat: latitude, lng: longitude }, "*");
        }
      },
      (err) => {
        console.error("Failed to get current location:", err);
        alert("Could not access your location. Please check your browser permissions.");
      }
    );
  };

  // Calculations
  const calculatedDeliveryFee = subtotal >= deliverySettings.min_free_delivery_amount || subtotal === 0 ? 0 : deliverySettings.delivery_fee;

  // Compute coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (subtotal >= appliedCoupon.min_order_value) {
      if (appliedCoupon.discount_type === "flat") {
        couponDiscount = appliedCoupon.discount_value;
      } else if (appliedCoupon.discount_type === "percentage") {
        couponDiscount = (subtotal * appliedCoupon.discount_value) / 100;
        if (appliedCoupon.max_discount) {
          couponDiscount = Math.min(couponDiscount, appliedCoupon.max_discount);
        }
      }
    }
  }

  const grandTotal = subtotal + calculatedDeliveryFee - couponDiscount;

  // Place Order transaction
  const handlePlaceOrder = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!selectedAddressId) {
      setErrorMessage("Please select a delivery address.");
      return;
    }
    try {
      setCheckoutLoading(true);
      setErrorMessage("");

      // 1. Create order
      const orderPayload = {
        profile_id: userId,
        address_id: selectedAddressId,
        total_amount: subtotal,
        delivery_fee: calculatedDeliveryFee,
        discount_amount: couponDiscount,
        net_amount: grandTotal,
        status: "pending",
        payment_method: "COD",
        payment_status: "pending",
        coupon_code: appliedCoupon?.code || null
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (orderErr || !order) {
        throw new Error(orderErr?.message || "Failed to submit order record.");
      }

      // 2. Insert items
      const itemsPayload = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsErr) {
        throw new Error(itemsErr.message);
      }

      // 3. Clear cart & redirect to track
      clearCart();
      router.push(`/orders/track?id=${order.id}&success=true`);
    } catch (err: any) {
      console.error("Failed to place order:", err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3.5 px-4 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 min-w-0 text-left">
          <button 
            onClick={() => router.push("/")} 
            className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-slate-800" />
          </button>
          
          <div className="min-w-0 cursor-pointer" onClick={() => setShowAddressDrawer(true)}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Delivering to</span>
            {addressLoading ? (
              <span className="text-[11px] font-black text-slate-400 block animate-pulse">Loading address...</span>
            ) : addresses.length === 0 ? (
              <span className="text-[11px] font-black text-amber-600 block">Add delivery address...</span>
            ) : (
              <span className="text-[11px] font-black text-slate-800 block truncate max-w-[160px] sm:max-w-md">
                {addresses.find(a => a.id === selectedAddressId)?.building_name || "Select Address"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button 
            onClick={() => setShowAddressDrawer(true)}
            className="text-[9px] font-black text-primary bg-primary/5 hover:bg-primary hover:text-white border border-primary/10 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            {addresses.length > 0 ? "CHANGE" : "ADD ADDRESS"}
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {cart.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 text-center rounded-2xl shadow-card border border-slate-100/85 space-y-4 max-w-md mx-auto mt-10"
          >
            <span className="text-5xl block">🛒</span>
            <h2 className="text-lg font-extrabold text-slate-800">Your cart is empty</h2>
            <p className="text-xs text-slate-400 max-w-[250px] mx-auto">
              Add fresh organic greens, seasonal fruits, and daily veggies to get started.
            </p>
            <Link href="/">
              <button className="bg-primary hover:bg-primary-dark text-white font-extrabold text-sm px-6 py-3 rounded-button shadow-premium transition-all duration-150 cursor-pointer">
                Start Shopping
              </button>
            </Link>
          </motion.div>
        ) : (
          /* Cart Content Layout */
          <div className="space-y-6">
            


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Items and Payment Forms */}
              <div className="md:col-span-2 space-y-5">
                {/* Items List */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
                    Items In Your Basket ({cart.length})
                  </span>
                  <div className="divide-y divide-slate-100">
                    <AnimatePresence>
                      {cart.map((item) => (
                        <motion.div
                          key={item.product.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex py-4 gap-4 items-center justify-between overflow-hidden"
                        >
                          <div className="relative w-14 h-14 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center border border-slate-100">
                            <img
                              src={item.product.images[0] || "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=200"}
                              alt={item.product.name}
                              className="object-contain p-1 w-full h-full"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5 text-left">
                            <h3 className="text-xs font-bold text-slate-800 truncate">
                              {item.product.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              {item.product.weight}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                ₹{item.product.price * item.quantity}
                              </span>
                              {item.product.discount > 0 && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  ₹{item.product.original_price * item.quantity}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-button overflow-hidden font-bold">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-1.5 select-none text-[10px] text-slate-700 font-extrabold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock}
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer text-xs"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Payment Option */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card text-left">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
                    Select Payment Method
                  </span>
                  <div className="space-y-2.5">
                    {/* COD */}
                    <label className="flex items-center gap-3 p-3 bg-emerald-50/30 border border-primary rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-extrabold text-slate-800 block">Cash on Delivery / Pay on Delivery</span>
                        <span className="text-[10px] text-slate-500 font-bold">Pay via Cash, UPI, or Cards when order is delivered.</span>
                      </div>
                    </label>

                    {/* Online Payments - Disabled */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl opacity-50 cursor-not-allowed">
                      <input
                        type="radio"
                        disabled
                        checked={false}
                        className="text-slate-300 h-4 w-4"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-extrabold text-slate-400 block">Online Payment</span>
                        <span className="text-[10px] text-slate-400 font-bold">Temporarily Unavailable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing Summary & Coupons */}
              <div className="space-y-5">
                {/* Coupons Picker Card - Flat inline list */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card text-left">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3.5">
                    Available Coupons
                  </span>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-600" />
                        <div>
                          <span className="text-xs font-extrabold text-emerald-950 uppercase">{appliedCoupon.code}</span>
                          <span className="block text-[9px] font-bold text-emerald-700">₹{couponDiscount} Saved</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] font-extrabold text-red-500 hover:underline cursor-pointer bg-transparent border-none"
                      >
                        Remove
                      </button>
                    </div>
                  ) : coupons.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 text-center py-2">No coupons available right now.</p>
                  ) : (
                    <div className="space-y-3.5 divide-y divide-slate-100">
                      {[...coupons]
                        .sort((a, b) => {
                          const aEligible = subtotal >= a.min_order_value ? 0 : 1;
                          const bEligible = subtotal >= b.min_order_value ? 0 : 1;
                          return aEligible - bEligible;
                        })
                        .map((c, idx) => {
                          const isEligible = subtotal >= c.min_order_value;
                          return (
                            <div key={c.id} className={`flex items-center justify-between gap-3 ${idx > 0 ? "pt-3" : ""}`}>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-800 uppercase block">{c.code}</span>
                                <span className="text-[9px] font-semibold text-slate-400 block leading-tight">
                                  {c.discount_type === "flat" ? `Flat ₹${c.discount_value} Off` : `${c.discount_value}% Off`} on orders above ₹{c.min_order_value}
                                </span>
                                {!isEligible && (
                                  <span className="text-[8px] font-extrabold text-amber-600 block mt-0.5">
                                    Add ₹{c.min_order_value - subtotal} more to unlock
                                  </span>
                                )}
                              </div>
                              <button
                                disabled={!isEligible}
                                onClick={() => setAppliedCoupon(c)}
                                className={`text-[10px] font-black px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
                                  isEligible
                                    ? "bg-primary border-primary text-white hover:bg-primary-dark shadow-sm hover:scale-105 active:scale-95"
                                    : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                Apply
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Bill Details Summary */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card space-y-4 text-left">
                  <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">
                    Bill Summary
                  </h3>

                  <div className="space-y-3.5 text-xs font-semibold">
                    <div className="flex justify-between text-slate-500">
                      <span>Item Subtotal</span>
                      <span className="text-slate-800 font-extrabold">₹{subtotal}</span>
                    </div>

                    {savings > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Item Savings</span>
                        <span>-₹{savings}</span>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-slate-500">
                        <span>Delivery Fee</span>
                        {calculatedDeliveryFee === 0 ? (
                          <span className="text-primary font-bold uppercase text-[10px] bg-primary/10 px-2 py-0.5 rounded">
                            FREE
                          </span>
                        ) : (
                          <span className="text-slate-800 font-extrabold">₹{calculatedDeliveryFee}</span>
                        )}
                      </div>
                      {calculatedDeliveryFee > 0 && (
                        <p className="text-[10px] text-primary font-bold mt-1">
                          Add ₹{deliverySettings.min_free_delivery_amount - subtotal} more for free delivery
                        </p>
                      )}
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Coupon Discount ({appliedCoupon?.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="pt-3.5 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-lg text-primary">₹{grandTotal}</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Desktop Only Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={checkoutLoading || cart.length === 0 || !selectedAddressId}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-4 rounded-button shadow-premium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hidden md:flex"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order (COD) <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Guarantees */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-[10px] font-bold text-slate-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <span>Delivery to your doorstep</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dynamic Mobile Checkout Fixed Footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 py-3.5 px-4 shadow-[0_-8px_30px_rgb(0,0,0,0.05)] md:hidden">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            {/* Payment Selection Indicator */}
            <div className="text-left space-y-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Payment Method</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800">Cash on Delivery</span>
                <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-250 px-1 rounded uppercase">
                  COD
                </span>
              </div>
            </div>

            {/* Place Order Trigger */}
            <button
              onClick={handlePlaceOrder}
              disabled={checkoutLoading || cart.length === 0 || !selectedAddressId}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-premium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs active:scale-[0.98]"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                </>
              ) : (
                <>
                  <span>Place Order • ₹{grandTotal}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Address Selection Bottom Sheet Drawer */}
      <AnimatePresence>
        {showAddressDrawer && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddressDrawer(false);
                setShowAddressForm(false);
                setEditingAddressId(null);
              }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100 max-w-md mx-auto overflow-hidden flex flex-col max-h-[85vh] text-left"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black text-slate-800">
                    {showAddressForm ? (editingAddressId ? "Edit Delivery Address" : "Add Delivery Address") : "Choose Delivery Location"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddressDrawer(false);
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer animate-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {addressLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-[10px] font-bold text-slate-400">Loading delivery options...</span>
                  </div>
                ) : showAddressForm ? (
                  /* Map address builder inside drawer */
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block mb-1">
                        1. Pin Your Location on Map
                      </span>
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                        <iframe
                          id="map-iframe"
                          srcDoc={`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                              <style>
                                html, body, #map { height: 100%; margin: 0; padding: 0; }
                                #map { width: 100%; height: 100%; }
                              </style>
                            </head>
                            <body>
                              <div id="map"></div>
                              <script>
                                var map = L.map('map').setView([${lat}, ${lng}], 15);
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                  maxZoom: 19,
                                  attribution: '© OpenStreetMap'
                                }).addTo(map);

                                var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);

                                function sendLocation(lat, lng) {
                                  window.parent.postMessage({ type: 'LOCATION_SELECT', lat: lat, lng: lng }, '*');
                                }

                                marker.on('dragend', function (e) {
                                  var position = marker.getLatLng();
                                  sendLocation(position.lat, position.lng);
                                });

                                map.on('click', function(e) {
                                  marker.setLatLng(e.latlng);
                                  sendLocation(e.latlng.lat, e.latlng.lng);
                                });

                                window.addEventListener('message', function(event) {
                                  if (event.data && event.data.type === 'UPDATE_COORDINATES') {
                                    var newLat = event.data.lat;
                                    var newLng = event.data.lng;
                                    marker.setLatLng([newLat, newLng]);
                                    map.setView([newLat, newLng], 15);
                                    sendLocation(newLat, newLng);
                                  }
                                });

                                sendLocation(${lat}, ${lng});
                              </script>
                            </body>
                            </html>
                          `}
                          className="w-full h-full border-none"
                        />
                      </div>
                      
                      {/* Fetch current location button */}
                      <div className="flex justify-between items-center mt-2">
                        <button
                          type="button"
                          onClick={handleFetchCurrentLocation}
                          className="text-[10px] font-black text-primary hover:underline cursor-pointer flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/10 transition-all active:scale-[0.98]"
                        >
                          <Locate className="h-3.5 w-3.5 text-primary animate-pulse" /> Fetch Current Location
                        </button>
                      </div>
                    </div>

                    {/* Serviceable area check */}
                    {(() => {
                      const distance = calculateDistance(STORE_LAT, STORE_LON, lat, lng);
                      const isServiceable = distance <= 2.0;
                      return (
                        <div className={`p-3.5 rounded-2xl border text-[11px] font-semibold text-left space-y-1 ${
                          isServiceable 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-805" 
                            : "bg-rose-50 border-rose-100 text-rose-805"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isServiceable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                            <span className="font-extrabold uppercase tracking-wide text-[9px]">
                              {isServiceable ? "Serviceable Area" : "Unserviceable Area"}
                            </span>
                          </div>
                          <p className="leading-relaxed">
                            {isServiceable 
                              ? `This location is approx. ${distance.toFixed(2)} KM from our store. Delivery is active!` 
                              : `This location is ${distance.toFixed(2)} KM from our store. We only deliver within 2.0 KM of Malleshwaram.`
                            }
                          </p>
                        </div>
                      );
                    })()}

                    <div className="space-y-3">
                      <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                        2. Specify Address Details
                      </span>
                      
                      <div className="flex gap-2">
                        {["Home", "Work", "Other"].map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAddressLabel(label)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              addressLabel === label
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Building/House Name*</label>
                        <input
                          type="text"
                          required
                          placeholder="House No, Floor, Building Name*"
                          value={buildingName}
                          onChange={(e) => setBuildingName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Area / Street Address*</label>
                        <input
                          type="text"
                          required
                          placeholder="Complete Area / Pincode*"
                          value={completeAddress}
                          onChange={(e) => setCompleteAddress(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold text-slate-800"
                        />
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddressForm(false);
                            setEditingAddressId(null);
                          }}
                          className="flex-1 bg-white border border-slate-200 text-slate-500 py-2 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleSaveAddress();
                          }}
                          disabled={savingAddress || calculateDistance(STORE_LAT, STORE_LON, lat, lng) > 2.0}
                          className="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                        >
                          {savingAddress ? "Saving..." : "Save Address"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Address selection list inside drawer */
                  <div className="space-y-4">
                    {addresses.length === 0 ? (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-xs font-bold text-slate-405">No delivery addresses saved yet.</p>
                        <button
                          onClick={() => {
                            setLat(STORE_LAT);
                            setLng(STORE_LON);
                            setShowAddressForm(true);
                          }}
                          className="bg-primary hover:bg-primary-dark text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-premium cursor-pointer transition-transform active:scale-[0.98]"
                        >
                          + Add Address with Map
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-2.5">
                          {addresses.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            return (
                              <div
                                key={addr.id}
                                onClick={() => {
                                  setSelectedAddressId(addr.id);
                                  setShowAddressDrawer(false);
                                }}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3.5 items-start justify-between text-left ${
                                  isSelected
                                    ? "bg-emerald-50/20 border-primary shadow-sm"
                                    : "bg-slate-50/30 border-slate-100 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex gap-3.5 items-start min-w-0 flex-1">
                                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                                    isSelected ? "bg-primary text-white" : "bg-white text-slate-400 border border-slate-100"
                                  }`}>
                                    {addr.name === "Home" ? <Home className="h-4.5 w-4.5" /> :
                                     addr.name === "Work" ? <Briefcase className="h-4.5 w-4.5" /> : <MapPin className="h-4.5 w-4.5" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-black text-slate-800 block">{addr.name}</span>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 leading-snug truncate">
                                      {addr.building_name}, {addr.complete_address}
                                    </p>
                                  </div>
                                </div>
                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAddressId(addr.id);
                                      setAddressLabel(addr.name);
                                      setBuildingName(addr.building_name);
                                      setCompleteAddress(addr.complete_address);
                                      setLat(addr.latitude || STORE_LAT);
                                      setLng(addr.longitude || STORE_LON);
                                      setShowAddressForm(true);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-primary cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm("Are you sure you want to delete this address?")) {
                                        const { error } = await supabase
                                          .from("addresses")
                                          .delete()
                                          .eq("id", addr.id);
                                        if (!error) {
                                          setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
                                          if (selectedAddressId === addr.id) {
                                            setSelectedAddressId("");
                                          }
                                        } else {
                                          console.error("Failed to delete address:", error);
                                        }
                                      }
                                    }}
                                    className="p-1.5 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setEditingAddressId(null);
                            setAddressLabel("Home");
                            setBuildingName("");
                            setCompleteAddress("");
                            setLat(STORE_LAT);
                            setLng(STORE_LON);
                            setShowAddressForm(true);
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          + Add New Address
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
