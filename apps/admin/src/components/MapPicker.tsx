"use client";

import React, { useEffect, useRef, useState } from "react";

interface MapPickerProps {
  lat: number;
  lon: number;
  onChange: (
    lat: number,
    lon: number,
    address?: string,
    details?: {
      postalCode?: string;
      city?: string;
      state?: string;
    }
  ) => void;
}

const STORE_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "12.971598");
const STORE_LON = parseFloat(process.env.NEXT_PUBLIC_STORE_LON || "77.594562");

export default function MapPicker({ lat, lon, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Leaflet CSS and JS via CDN
  useEffect(() => {
    // Check if Leaflet is already loaded
    if (window.hasOwnProperty("L")) {
      setLeafletLoaded(true);
      return;
    }

    // Add Leaflet CSS
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    const scriptId = "leaflet-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      const script = document.getElementById(scriptId) as HTMLScriptElement;
      script.addEventListener("load", () => setLeafletLoaded(true));
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([lat || STORE_LAT, lon || STORE_LON], 15);
    mapInstanceRef.current = map;

    // Add CartoDB Voyager Tiles (Modern & clean map design)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add 2KM Delivery Circle (emerald green)
    L.circle([STORE_LAT, STORE_LON], {
      color: "#10B981", // Emerald-500
      fillColor: "#10B981",
      fillOpacity: 0.1,
      radius: 2000, // 2 KM
    }).addTo(map);

    // Create Draggable Delivery Marker
    const marker = L.marker([lat || STORE_LAT, lon || STORE_LON], {
      draggable: true,
    }).addTo(map);
    markerInstanceRef.current = marker;

    const reverseGeocode = async (lLat: number, lLon: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lLat}&lon=${lLon}`
        );
        const data = await response.json();
        if (data && data.display_name) {
          setSearchQuery(data.display_name);
          
          let postalCode = data.address?.postcode || data.address?.postal_code || "";
          let city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || "Bengaluru";
          let state = data.address?.state || "Karnataka";

          onChange(lLat, lLon, data.display_name, { postalCode, city, state });
        }
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
      }
    };

    // Listen to marker drag events
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      reverseGeocode(position.lat, position.lng);
    });

    // Listen to map click events
    map.on("click", (e: any) => {
      const clickedPos = e.latlng;
      marker.setLatLng(clickedPos);
      reverseGeocode(clickedPos.lat, clickedPos.lng);
    });

    // Fix map sizing issues that can happen in flex containers
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [leafletLoaded]);

  // Update marker position if props change externally
  useEffect(() => {
    if (!leafletLoaded || !markerInstanceRef.current || !mapInstanceRef.current) return;

    const currentPos = markerInstanceRef.current.getLatLng();
    if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lon) > 0.0001) {
      const newPos = [lat, lon];
      markerInstanceRef.current.setLatLng(newPos);
      mapInstanceRef.current.panTo(newPos);
    }
  }, [lat, lon, leafletLoaded]);

  // Fetch address suggestions from free OpenStreetMap Nominatim API
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Query Bengaluru / India locations for relevance
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
            value
          )}&countrycodes=in&viewbox=77.45,12.85,77.75,13.10&bounded=1&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }, 400); // 400ms debounce
  };

  const selectSuggestion = (s: any) => {
    const newLat = parseFloat(s.lat);
    const newLon = parseFloat(s.lon);

    setSearchQuery(s.display_name);
    setSuggestions([]);
    setShowSuggestions(false);

    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLon], 16);
      markerInstanceRef.current.setLatLng([newLat, newLon]);
      
      let postalCode = s.address?.postcode || s.address?.postal_code || "";
      let city = s.address?.city || s.address?.town || s.address?.village || s.address?.suburb || "Bengaluru";
      let state = s.address?.state || "Karnataka";

      onChange(newLat, newLon, s.display_name, { postalCode, city, state });
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLon], 16);
          markerInstanceRef.current.setLatLng([newLat, newLon]);

          // Reverse geocode to get human readable address and details
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLon}`
            );
            const data = await response.json();
            if (data && data.display_name) {
              setSearchQuery(data.display_name);
              
              let postalCode = data.address?.postcode || data.address?.postal_code || "";
              let city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || "Bengaluru";
              let state = data.address?.state || "Karnataka";

              onChange(newLat, newLon, data.display_name, { postalCode, city, state });
            }
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
            onChange(newLat, newLon);
          }
        }
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check your browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3 relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          placeholder="Search for your delivery address..."
          className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white transition-all duration-150 shadow-inner"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Suggestion Dropdown */}
        {showSuggestions && (
          <div className="absolute z-[1000] w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((s, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors leading-relaxed block"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full h-[250px] rounded-xl border border-slate-200/80 shadow-inner overflow-hidden bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Locate Me Floating Button */}
        <button
          type="button"
          onClick={locateUser}
          disabled={locating}
          className="absolute bottom-4 right-4 z-[1000] p-3 bg-white hover:bg-slate-50 text-primary border border-slate-200 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
          title="Use Current Location"
        >
          {locating ? (
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 font-semibold gap-1.5 px-1">
        <span>* Click on the map or drag the marker to pin location</span>
        <span className="flex items-center gap-1 text-primary">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inside Delivery Zone
        </span>
      </div>
    </div>
  );
}
