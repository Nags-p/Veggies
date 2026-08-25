"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function CapacitorBackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, []);

  useEffect(() => {
    let appListener: any = null;

    async function initBackButton() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          // @ts-ignore
          const { App } = await import("@capacitor/app");
          
          if (appListener) {
            appListener.remove();
          }

          appListener = await App.addListener("backButton", (data: any) => {
            if (pathname === "/" || pathname === "/login" || !data.canGoBack) {
              App.exitApp();
            } else {
              window.history.back();
            }
          });
        } catch (err) {
          console.error("Capacitor App plugin backButton listener failed:", err);
        }
      }
    }

    initBackButton();

    return () => {
      if (appListener) {
        appListener.remove();
      }
    };
  }, [pathname]);

  return null;
}
