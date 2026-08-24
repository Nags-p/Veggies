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
    let ordersChannel: any = null;

    async function requestSpecialPermissions() {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { registerPlugin } = await import("@capacitor/core");
          const BackgroundActivity = registerPlugin("BackgroundActivity");
          
          // Request Draw Overlays (Display over other apps)
          const overlayStatus = await (BackgroundActivity as any).checkDrawOverlaysPermission();
          if (!overlayStatus.granted) {
            await (BackgroundActivity as any).requestDrawOverlaysPermission();
          }

          // Request Ignore Battery Optimizations
          const batteryStatus = await (BackgroundActivity as any).checkBatteryOptimizations();
          if (!batteryStatus.ignored) {
            await (BackgroundActivity as any).requestIgnoreBatteryOptimizations();
          }
        } catch (err) {
          console.error("Failed to request special permissions:", err);
        }
      }
    }
    requestSpecialPermissions();

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
              console.log("Admin FCM registration success, token:", token.value);
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from("profiles")
                  .update({ fcm_token: token.value })
                  .eq("id", user.id);
                if (error) {
                  console.error("Failed to save Admin FCM token to profiles:", error);
                } else {
                  console.log("Successfully saved Admin FCM token to profile!");
                }
              }
            }
          );

          // 2. Listen for token registration error
          errListener = await PushNotifications.addListener(
            "registrationError",
            (error) => {
              console.error("Admin FCM registration failed:", error);
            }
          );

          // 3. Listen for push notification received in foreground
          recvListener = await PushNotifications.addListener(
            "pushNotificationReceived",
            async (notification) => {
              console.log("Admin Push received in foreground:", notification);
              
              // Bring app to foreground and wake up screen (display over other apps)
              if (typeof window !== "undefined" && (window as any).Capacitor) {
                try {
                  const { registerPlugin } = await import("@capacitor/core");
                  const BackgroundActivity = registerPlugin("BackgroundActivity");
                  await (BackgroundActivity as any).bringToForeground();
                } catch (bgErr) {
                  console.error("Failed to bring app to foreground:", bgErr);
                }
              }

              // Vibrate phone continuously
              if (typeof window !== "undefined" && (window as any).Capacitor) {
                try {
                  const { registerPlugin } = await import("@capacitor/core");
                  const BackgroundActivity = registerPlugin("BackgroundActivity");
                  await (BackgroundActivity as any).startContinuousVibration();
                } catch (vibErr) {
                  console.error("Vibration failed:", vibErr);
                }
              } else if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                  navigator.vibrate([1000, 500, 1000]);
                } catch (vibErr) {
                  console.error("Vibration failed:", vibErr);
                }
              }

              // Play alert sound
              try {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
                audio.play();
              } catch (soundErr) {
                console.log("Audio alert playback blocked:", soundErr);
              }

              // Trigger local notification popup in foreground
              if (typeof window !== "undefined" && (window as any).Capacitor) {
                try {
                  const { LocalNotifications } = await import("@capacitor/local-notifications");
                  await LocalNotifications.requestPermissions();
                  await LocalNotifications.deleteChannel({ id: 'orders' }).catch(() => {});
                  await LocalNotifications.createChannel({
                    id: 'admin_order_alerts',
                    name: 'Order Alerts',
                    description: 'Notifications for incoming new orders',
                    importance: 5,
                    visibility: 1,
                    vibration: true
                  });
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: notification.title || "New Order Received! 🛒",
                        body: notification.body || "",
                        id: Math.floor(Math.random() * 100000),
                        channelId: 'admin_order_alerts',
                        smallIcon: 'ic_launcher_foreground'
                      }
                    ]
                  });
                } catch (capErr) {
                  console.error("Capacitor LocalNotification failed in foreground push:", capErr);
                }
              }
            }
          );

          // 4. Listen for tap action on push notification
          actListener = await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              console.log("Admin Push action performed:", action);
              const orderId = action.notification.data?.orderId;
              if (orderId) {
                router.push(`/?orderId=${orderId}`);
              }
            }
          );
        } catch (err) {
          console.error("Error setting up push listeners:", err);
        }
      }
    }

    async function subscribeToOrders() {
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel);
      }

      ordersChannel = supabase
        .channel(`admin-global-new-orders-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          async (payload: any) => {
            const newOrder = payload.new;

            // 1. Bring app to foreground and wake up screen (display over other apps)
            if (typeof window !== "undefined" && (window as any).Capacitor) {
              try {
                const { registerPlugin } = await import("@capacitor/core");
                const BackgroundActivity = registerPlugin("BackgroundActivity");
                await (BackgroundActivity as any).bringToForeground();
              } catch (bgErr) {
                console.error("Failed to bring app to foreground:", bgErr);
              }
            }

            // 2. Play alert sound
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
              audio.play();
            } catch (soundErr) {
              console.log("Audio alert playback blocked by browser settings:", soundErr);
            }

            // 3. Vibrate the phone continuously
            if (typeof window !== "undefined" && (window as any).Capacitor) {
              try {
                const { registerPlugin } = await import("@capacitor/core");
                const BackgroundActivity = registerPlugin("BackgroundActivity");
                await (BackgroundActivity as any).startContinuousVibration();
              } catch (vibErr) {
                console.error("Vibration failed:", vibErr);
              }
            } else if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate([1000, 500, 1000]);
              } catch (vibErr) {
                console.error("Vibration failed:", vibErr);
              }
            }

            // 4. Trigger Capacitor Local Notification to pop up in foreground
            if (typeof window !== "undefined" && (window as any).Capacitor) {
              try {
                const { LocalNotifications } = await import("@capacitor/local-notifications");
                await LocalNotifications.requestPermissions();
                await LocalNotifications.deleteChannel({ id: 'orders' }).catch(() => {});
                await LocalNotifications.createChannel({
                  id: 'admin_order_alerts',
                  name: 'Order Alerts',
                  description: 'Notifications for incoming new orders',
                  importance: 5,
                  visibility: 1,
                  vibration: true
                });
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      title: "New Order Received! 🛒",
                      body: `Order #${newOrder.id.slice(0, 8).toUpperCase()} is pending review.`,
                      id: Math.floor(Math.random() * 100000),
                      channelId: 'admin_order_alerts',
                      smallIcon: 'ic_launcher_foreground'
                    }
                  ]
                });
              } catch (capErr) {
                console.error("Capacitor LocalNotification failed:", capErr);
              }
            }
          }
        )
        .subscribe();
    }

    setupListeners();

    // Register push when user logs in or auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (user) {
          subscribeToOrders();
        }
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          try {
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
      } else if (event === "SIGNED_OUT") {
        if (ordersChannel) {
          supabase.removeChannel(ordersChannel);
          ordersChannel = null;
        }
      }
    });

    // Also run immediately if the user is already logged in on mount
    async function checkUserAndRegister() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        subscribeToOrders();
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          try {
            const { PushNotifications } = await import("@capacitor/push-notifications");
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive !== "granted") {
              permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive === "granted") {
              await PushNotifications.register();
            }
          } catch (e) {
            // Log warning
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
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel);
      }
    };
  }, [router, supabase]);

  return null;
}
