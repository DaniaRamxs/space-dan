package com.dan.space;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "VoiceService",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class VoiceServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        // Request RECORD_AUDIO before starting the foreground service.
        // Android 14+ throws if the service uses foregroundServiceType=microphone
        // without the permission being granted at call time.
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermissionCallback");
            return;
        }
        doStart(call);
    }

    @PermissionCallback
    private void micPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            doStart(call);
        } else {
            call.reject("Microphone permission denied");
        }
    }

    private void doStart(PluginCall call) {
        Intent intent = new Intent(getContext(), VoiceService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), VoiceService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
