"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Sparkles, CloudLightning } from "lucide-react";

export default function CapacitorUpdateChecker() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Only check inside client environment
    if (typeof window === "undefined") return;

    // Check version function
    const checkAppVersion = async () => {
      try {
        // Build version.json URL relative to current base path to support GitHub Pages basePath
        let basePath = window.location.pathname;
        if (basePath.endsWith(".html") || basePath.endsWith("/index.html")) {
          basePath = basePath.substring(0, basePath.lastIndexOf("/"));
        }
        if (!basePath.endsWith("/")) {
          basePath += "/";
        }
        
        const url = `${window.location.origin}${basePath}version.json?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const remoteVersion = data.version;
        if (!remoteVersion) return;

        const localVersion = localStorage.getItem("app_version");

        if (localVersion && localVersion !== remoteVersion) {
          // Version mismatch! Trigger update alert
          setLatestVersion(remoteVersion);
          setShowUpdateModal(true);
        } else if (!localVersion) {
          // Set initial local version if not present
          localStorage.setItem("app_version", remoteVersion);
        }
      } catch (err) {
        console.warn("Failed to check app version:", err);
      }
    };

    // Delay check slightly after mount for smoother UI load
    const timer = setTimeout(() => {
      checkAppVersion();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    if (typeof window === "undefined") return;
    setUpdating(true);

    // Save latest version string
    localStorage.setItem("app_version", latestVersion);

    // Force page reload by appending current timestamp to bypass cache completely
    setTimeout(() => {
      const reloadUrl = `${window.location.origin}${window.location.pathname}?v=${Date.now()}`;
      window.location.href = reloadUrl;
    }, 800);
  };

  if (!showUpdateModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Dynamic decorative backdrop gradient */}
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-emerald-100/40 rounded-full blur-2xl" />

        {/* Icon Header */}
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100/50 shadow-sm relative">
          <CloudLightning className="h-8 w-8 text-emerald-600 animate-pulse" />
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Content */}
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5 mb-1.5 justify-center">
          <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
          New Update Available!
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6 px-2">
          We've updated Veggies with new features, catalog upgrades, and bug fixes. Let's restart the app with the latest changes!
        </p>

        {/* Button */}
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition-all shadow-premium cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-80"
        >
          {updating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Updating application...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Restart & Update Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
