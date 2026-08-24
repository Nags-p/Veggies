"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, ShieldCheck, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function normalizeIndianPhone(phone: string): string {
  const clean = phone.trim().replace(/\D/g, ""); // remove non-digits
  if (clean.length === 10) {
    return "+91" + clean;
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    return "+" + clean;
  }
  if (phone.trim().startsWith("+")) {
    return phone.trim();
  }
  return "+91" + clean;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read initial mode from query param, default to "signin"
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // If search param changes, sync the mode
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup") {
      setMode("signup");
    } else if (m === "signin") {
      setMode("signin");
    }
  }, [searchParams]);

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!phone) {
      setError("Phone number is required");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !fullName) {
      setError("Full name is required for registration");
      setLoading(false);
      return;
    }

    // Mock send OTP code locally (bypasses Twilio and works offline/client-side)
    setLoading(false);
    setStep("otp");
    setMessage("Verification code sent successfully! Use code 123456 to verify.");
    setResendTimer(60);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    // Mock resend OTP code locally (bypasses Twilio and works offline/client-side)
    setLoading(false);
    setMessage("A new verification code has been sent. Use code 123456.");
    setResendTimer(60);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split("");
      const newCode = [...code];
      pastedData.forEach((char, idx) => {
        if (idx < 6) newCode[idx] = char;
      });
      setCode(newCode);
      const nextFocus = Math.min(pastedData.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please enter the full 6-digit code");
      setLoading(false);
      return;
    }

    if (fullCode.trim() !== "123456") {
      setError("Invalid verification code. Please use 123456 for testing.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const formattedPhone = normalizeIndianPhone(phone);
      const cleanPhoneNum = formattedPhone.replace("+", "");
      const email = `${cleanPhoneNum}@veggies.local`;
      const password = `${cleanPhoneNum}_VeggiesDummy123!`;

      // 1. Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message !== "Invalid login credentials") {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // 2. User doesn't exist, sign them up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: formattedPhone,
              full_name: fullName?.trim() || "Customer",
              role: "customer"
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (!signUpData.session) {
          setError("Email confirmation is enabled in your Supabase Dashboard. Please disable 'Confirm email' in Supabase -> Authentication -> Providers -> Email.");
          setLoading(false);
          return;
        }
      }

      const redirectUrl = searchParams.get("redirect") || "/";
      router.push(redirectUrl);
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl shadow-premium border border-accent/10"
      >
        <div className="text-center">
          <Link href="/">
            <span className="text-3xl font-extrabold text-primary tracking-tight cursor-pointer">
              Veggies
            </span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {mode === "signin" ? "Welcome Back!" : "Create an Account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin" 
              ? "Login to your premium grocery store" 
              : "Register with your phone number for 10-minute delivery"}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100"
          >
            {error}
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 text-sm text-green-700 bg-green-50 rounded-xl border border-green-100"
          >
            {message}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div
              key="phone-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <form className="space-y-4" onSubmit={handleSendOtp}>
                {mode === "signup" && (
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required={mode === "signup"}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm bg-slate-50/50"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm bg-slate-50/50"
                      placeholder="98765 43210"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full justify-center rounded-button bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-premium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Send OTP Code <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </div>
              </form>

              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative px-3 text-xs text-slate-400 bg-white uppercase font-medium">
                  {mode === "signin" ? "New to Veggies?" : "Have an account?"}
                </span>
              </div>

              <div>
                {mode === "signin" ? (
                  <button
                    onClick={() => setMode("signup")}
                    className="flex w-full justify-center items-center gap-2 rounded-button border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
                  >
                    Create a New Account
                  </button>
                ) : (
                  <button
                    onClick={() => setMode("signin")}
                    className="flex w-full justify-center items-center gap-2 rounded-button border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
                  >
                    Sign In with Phone Number
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <button
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-2"
                >
                  <ArrowLeft className="h-3 w-3" /> Edit Phone ({phone})
                </button>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  Verify Your Number
                </h3>
                <p className="text-xs text-slate-500">
                  We sent a 6-digit OTP code to {phone}
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-extrabold border border-slate-200 rounded-xl bg-slate-50/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-150"
                    />
                  ))}
                </div>

                <div className="text-center space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center items-center gap-1.5 rounded-button bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-premium hover:bg-primary-dark transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <>
                        Verify & Login <ShieldCheck className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="text-xs font-semibold text-primary disabled:text-slate-400 hover:text-primary-dark pt-2 block mx-auto"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                  </button>
                </div>
              </form>

              {/* Developer Test Helper */}
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-xs text-primary font-medium space-y-1">
                <div className="font-extrabold uppercase tracking-wider text-[10px] text-primary/80">
                  Testing Guide
                </div>
                <p className="leading-relaxed">
                  For testing, use **any** 10-digit number (e.g., your real number <code className="font-mono bg-primary/10 px-1 py-0.5 rounded">8050103865</code>) and dummy OTP <code className="font-mono bg-primary/10 px-1 py-0.5 rounded">123456</code>.
                </p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Note: Twilio setup is bypassed! This maps numbers to email accounts programmatically. If you run into a confirmation error, ensure "Confirm email" is toggled **OFF** in your Supabase Dashboard under Authentication → Providers → Email.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
