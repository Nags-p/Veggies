"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CapacitorPushNotificationHandler() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let pushListener: any = null;
    let errListener: any = null;
    let recvListener: any = null;
    let actListener: any = null;

    async function setupListeners() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");

          // Remove any existing listeners first
          if (pushListener) pushListener.remove();
          if (errListener) errListener.remove();
          if (recvListener) recvListener.remove();
          if (actListener) actListener.remove();

          // 1. Listen for token registration success
          pushListener = await PushNotifications.addListener(
            "registration",
            async (token) => {
              console.log("FCM registration success, token:", token.value);
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from("profiles")
                  .update({ fcm_token: token.value })
                  .eq("id", user.id);
                if (error) {
                  console.error("Failed to save FCM token to profiles:", error);
                } else {
                  console.log("Successfully saved FCM token to profile!");
                }
              }
            }
          );

          // 2. Listen for token registration error
          errListener = await PushNotifications.addListener(
            "registrationError",
            (error) => {
              console.error("FCM registration failed:", error);
            }
          );

          // 3. Listen for push notification received in foreground
          recvListener = await PushNotifications.addListener(
            "pushNotificationReceived",
            async (notification) => {
              console.log("Push received in foreground:", notification);
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                  navigator.vibrate([1000, 500, 1000]);
                } catch (vibErr) {
                  console.error("Vibration failed:", vibErr);
                }
              }

              // Trigger a local notification so it pops up as a system notification banner in the foreground
              if (typeof window !== "undefined" && (window as any).Capacitor) {
                try {
                  const { LocalNotifications } = await import("@capacitor/local-notifications");
                  await LocalNotifications.requestPermissions();
                  await LocalNotifications.createChannel({
                    id: 'customer_order_alerts',
                    name: 'Order Alerts',
                    description: 'Notifications for order updates and status changes',
                    importance: 5,
                    visibility: 1,
                    vibration: true
                  });
                  // Show a visual alert directly in the web app UI
                  if (typeof window !== "undefined") {
                    alert(`🌟 Veggies Alert: ${notification.title}\n\n${notification.body}`);
                  }

                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: `🌟 Veggies Live: ${notification.title || "New Notification"}`,
                        body: notification.body || "",
                        id: Math.floor(Math.random() * 100000),
                        channelId: 'customer_order_alerts',
                        smallIcon: 'ic_launcher_foreground',
                      }
                    ]
                  });
                } catch (capErr) {
                  console.error("Capacitor LocalNotification failed in push handler:", capErr);
                }
              }
            }
          );

          // 4. Listen for tap action on push notification
          actListener = await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              console.log("Push action performed:", action);
              const orderId = action.notification.data?.orderId;
              if (orderId) {
                router.push(`/orders/track?id=${orderId}`);
              }
            }
          );
        } catch (err) {
          console.error("Error setting up push listeners:", err);
        }
      }
    }

    setupListeners();

    async function ensureNotificationChannel() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          await LocalNotifications.requestPermissions();
          // Delete old channel to force Android to register the new settings
          await LocalNotifications.deleteChannel({ id: 'orders' }).catch(() => {});
          
          await LocalNotifications.createChannel({
            id: 'customer_order_alerts',
            name: 'Order Alerts',
            description: 'Notifications for order updates and status changes',
            importance: 5,
            visibility: 1,
            vibration: true
          });
        } catch (err) {
          console.error("Failed to create notification channel:", err);
        }
      }
    }

    // Register push when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          try {
            await ensureNotificationChannel();
            const { PushNotifications } = await import("@capacitor/push-notifications");
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive !== "granted") {
              permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive === "granted") {
              await PushNotifications.register();
            }
          } catch (e) {
            console.error("Failed to register push on signin:", e);
          }
        }
      }
    });

    // Also run immediately if the user is already logged in on mount
    async function checkUserAndRegister() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          try {
            await ensureNotificationChannel();
            const { PushNotifications } = await import("@capacitor/push-notifications");
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive !== "granted") {
              permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive === "granted") {
              await PushNotifications.register();
            }
          } catch (e) {
            console.error("Failed to register push on mount:", e);
          }
        }
      }
    }
    checkUserAndRegister();

    // Cleanup listeners on unmount
    return () => {
      subscription.unsubscribe();
      if (pushListener) pushListener.remove();
      if (errListener) errListener.remove();
      if (recvListener) recvListener.remove();
      if (actListener) actListener.remove();
    };
  }, [router, supabase]);

  return null;
}
