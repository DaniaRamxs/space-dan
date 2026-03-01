package com.dan.space;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class RadioService extends Service {

    static final String  CHANNEL_ID = "space_dan_radio_channel";
    static final int     NOTIF_ID   = 1002;

    /** Leído por MainActivity.onPause() para saber si mantener el WebView activo. */
    public static volatile boolean isRunning = false;

    private WifiManager.WifiLock wifiLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String name  = intent != null ? intent.getStringExtra("station_name") : "Radio";
        String genre = intent != null ? intent.getStringExtra("genre") : "";

        isRunning = true;

        // WifiLock: evita que el sistema apague el WiFi mientras se hace streaming
        WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
        if (wifi != null && wifiLock == null) {
            wifiLock = wifi.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SpaceDanRadio");
        }
        if (wifiLock != null && !wifiLock.isHeld()) wifiLock.acquire();

        createNotificationChannel();

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openApp, PendingIntent.FLAG_IMMUTABLE
        );

        String title = "◈ " + (name  != null && !name.isEmpty()  ? name  : "Dan Radio");
        String text  =         genre != null && !genre.isEmpty() ? genre : "Reproduciendo en segundo plano";

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_radio_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIF_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
        super.onDestroy();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Dan Radio",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Reproducción de radio en segundo plano");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.setSound(null, null);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
