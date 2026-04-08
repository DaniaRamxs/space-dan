package com.dan.space;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RadioService")
public class RadioServicePlugin extends Plugin {

    /** Inicia el servicio de radio en primer plano con la estación actual. */
    @PluginMethod
    public void start(PluginCall call) {
        String name  = call.getString("name",  "Dan Radio");
        String genre = call.getString("genre", "");

        Intent intent = new Intent(getContext(), RadioService.class);
        intent.putExtra("station_name", name);
        intent.putExtra("genre",        genre);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    /** Detiene el servicio de radio. */
    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), RadioService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
