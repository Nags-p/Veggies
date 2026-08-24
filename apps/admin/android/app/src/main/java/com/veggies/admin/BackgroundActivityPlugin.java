package com.veggies.admin;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundActivity")
public class BackgroundActivityPlugin extends Plugin {

    @PluginMethod
    public void bringToForeground(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                    | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT 
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP 
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to bring to foreground: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopVibration(PluginCall call) {
        try {
            MyFirebaseMessagingService.stopVibration();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop vibration: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startContinuousVibration(PluginCall call) {
        try {
            MyFirebaseMessagingService.startContinuousVibration(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start vibration: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkDrawOverlaysPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ret.put("granted", Settings.canDrawOverlays(getContext()));
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestDrawOverlaysPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void checkBatteryOptimizations(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ret.put("ignored", pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        } else {
            ret.put("ignored", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                try {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    // Fallback to application settings details page
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void openApplicationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open settings: " + e.getMessage());
        }
    }
}
