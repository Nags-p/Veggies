import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { LocationProvider } from "@/context/LocationContext";
import LocationModal from "@/components/LocationModal";
import CapacitorPushNotificationHandler from "@/components/CapacitorPushNotificationHandler";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veggies - Fresh Fruits & Vegetables Delivered",
  description: "Get premium quality local fresh fruits and vegetables delivered within 10 minutes. Organic, seasonal, and exotic veggies straight to your doorstep.",
  keywords: ["grocery delivery", "fresh vegetables", "fruits", "organic veggies", "local store", "Blinkit alternative"],
  authors: [{ name: "Veggies Store" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable}`}>
      <body className="antialiased min-h-screen text-slate-800 bg-background">
        <LocationProvider>
          <CartProvider>
            {children}
            <LocationModal />
            <CapacitorPushNotificationHandler />
          </CartProvider>
        </LocationProvider>
      </body>
    </html>
  );
}

