package com.dan.space;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoiceService")
public class VoiceServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
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
