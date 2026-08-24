"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, ShieldCheck, ArrowRight, MapPin, Home, Briefcase, Tag, AlertCircle, Loader2 } from "lucide-react";
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

  // Address creation form inline
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [savingAddress, setSavingAddress] = useState(false);

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

  // Handle inline address save
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !buildingName || !completeAddress) return;
    try {
      setSavingAddress(true);
      const newAddress = {
        profile_id: userId,
        name: addressLabel,
        building_name: buildingName,
        complete_address: completeAddress,
        latitude: 13.0017689, // Default Malleshwaram
        longitude: 77.5777957,
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
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAddress(false);
    }
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
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 py-3.5 px-4 md:px-8 flex justify-between items-center shadow-sm">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-black text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </span>
        </Link>
        <h1 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
          <ShoppingBag className="h-4.5 w-4.5 text-primary" /> Your Cart
        </h1>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Items and Checkout Forms */}
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

              {/* Delivery Address Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card text-left">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Delivery Address
                  </span>
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
                    >
                      + Add Address
                    </button>
                  )}
                </div>

                {addressLoading ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : showAddressForm ? (
                  /* Inline Address Form */
                  <form onSubmit={handleSaveAddress} className="space-y-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
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
                      <input
                        type="text"
                        required
                        placeholder="Complete Area / Pincode*"
                        value={completeAddress}
                        onChange={(e) => setCompleteAddress(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold text-slate-800"
                      />
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="flex-1 bg-white border border-slate-200 text-slate-500 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                      >
                        {savingAddress ? "Saving..." : "Save Address"}
                      </button>
                    </div>
                  </form>
                ) : addresses.length === 0 ? (
                  <div className="p-4 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-xl text-xs font-semibold text-center">
                    No delivery address saved. Click "+ Add Address" to proceed.
                  </div>
                ) : (
                  /* Address List / Dropdown Selection */
                  <div className="grid grid-cols-1 gap-2.5">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-start ${
                          selectedAddressId === addr.id
                            ? "bg-emerald-50/30 border-primary shadow-sm"
                            : "bg-white border-slate-100 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${
                          selectedAddressId === addr.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
                        }`}>
                          {addr.name === "Home" ? <Home className="h-4 w-4" /> :
                           addr.name === "Work" ? <Briefcase className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-black text-slate-800">{addr.name}</span>
                          <p className="text-[11px] font-bold text-slate-500 mt-1 leading-snug">
                            {addr.building_name}, {addr.complete_address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              {/* Coupons Picker Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3.5">
                  Apply Coupon
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
                      className="text-[10px] font-extrabold text-red-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCouponsList(!showCouponsList)}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-xs font-black text-slate-700 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Tag className="h-4 w-4 text-primary" /> View Available Coupons
                    </button>

                    {showCouponsList && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pt-2 divide-y divide-slate-50">
                        {coupons.length === 0 ? (
                          <p className="text-[10px] font-bold text-slate-400 text-center py-2">No coupons available right now.</p>
                        ) : (
                          [...coupons].sort((a, b) => {
                            const aEligible = subtotal >= a.min_order_value ? 0 : 1;
                            const bEligible = subtotal >= b.min_order_value ? 0 : 1;
                            return aEligible - bEligible;
                          }).map((c) => {
                            const isEligible = subtotal >= c.min_order_value;
                            return (
                              <div key={c.id} className="pt-2 pb-1.5 flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-xs font-black text-slate-800 uppercase block">{c.code}</span>
                                  <span className="text-[9px] font-medium text-slate-400 block leading-tight">
                                    {c.discount_type === "flat" ? `₹${c.discount_value} Off` : `${c.discount_value}% Off`} on orders above ₹{c.min_order_value}
                                  </span>
                                </div>
                                <button
                                  disabled={!isEligible}
                                  onClick={() => {
                                    setAppliedCoupon(c);
                                    setShowCouponsList(false);
                                  }}
                                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isEligible
                                      ? "bg-primary border-primary text-white hover:bg-primary-dark"
                                      : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                  }`}
                                >
                                  Apply
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
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

                <button
                  onClick={handlePlaceOrder}
                  disabled={checkoutLoading || cart.length === 0}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-4 rounded-button shadow-premium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
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
        )}
      </main>

      <FooterNav />
    </div>
  );
}
