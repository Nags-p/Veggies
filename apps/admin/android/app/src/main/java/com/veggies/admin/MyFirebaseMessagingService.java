package com.veggies.admin;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.os.VibrationEffect;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFirebaseMessaging";
    private static Vibrator vibrator = null;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // We only trigger overlay wakeup and continuous vibration for new order alerts
        boolean isNewOrder = true;
        if (remoteMessage.getData().containsKey("isNewOrder")) {
            isNewOrder = "true".equals(remoteMessage.getData().get("isNewOrder"));
        }

        if (isNewOrder) {
            String title = remoteMessage.getData().get("title");
            String body = remoteMessage.getData().get("body");
            String orderId = remoteMessage.getData().get("orderId");

            if (title == null) title = "New Order Received! 🛒";
            if (body == null) body = "A new order is pending review.";

            showNotification(getApplicationContext(), title, body, orderId);
            startContinuousVibration(getApplicationContext());
        }
    }

    private void showNotification(Context context, String title, String body, String orderId) {
        try {
            String channelId = "admin_order_alerts";
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        channelId,
                        "Order Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notifications for incoming new orders");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 1000, 500, 1000});
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                }
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                    | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT 
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP 
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (orderId != null) {
                intent.putExtra("orderId", orderId);
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    1001,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            int iconResId = context.getResources().getIdentifier("ic_launcher_foreground", "mipmap", context.getPackageName());
            if (iconResId == 0) {
                iconResId = context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName());
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(iconResId)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setFullScreenIntent(pendingIntent, true)
                    .setAutoCancel(true)
                    .setOngoing(true);

            if (notificationManager != null) {
                notificationManager.notify(1001, builder.build());
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage());
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
    }

    private void bringAppToForeground() {
        try {
            Context context = getApplicationContext();
            
            // 1. Wake up the screen using PowerManager WakeLock
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "Veggies:WakeLock"
                );
            wakeLock.acquire(10000); // Keep screen on for 10 seconds

            // 2. Launch MainActivity
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                    | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT 
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP 
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to bring app to foreground: " + e.getMessage());
        }
    }

    public static void startContinuousVibration(Context context) {
        try {
            if (vibrator == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager vibratorManager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    vibrator = vibratorManager.getDefaultVibrator();
                } else {
                    vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                }
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                // Vibrate pattern: Vibrate 1s, Pause 0.5s, Vibrate 1s... repeating
                long[] pattern = {0, 1000, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1)); // 1 means repeat from index 1 (1s vibrate, 0.5s pause)
                } else {
                    vibrator.vibrate(pattern, 1);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start continuous vibration: " + e.getMessage());
        }
    }

    public static void stopVibration() {
        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "Continuous vibration cancelled successfully.");
            } catch (Exception e) {
                Log.e(TAG, "Failed to cancel vibration: " + e.getMessage());
            }
        }
    }
}
