package com.dan.space;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class VoiceService extends Service {

    static final String CHANNEL_ID   = "space_dan_voice_channel";
    static final int    NOTIF_ID     = 1001;

    /** Checked by MainActivity to keep the WebView alive during background. */
    public static boolean isRunning = false;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        isRunning = true;
        createNotificationChannel();

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openApp, PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Spacely — Sala de Voz")
            .setContentText("Micrófono activo en segundo plano")
            .setSmallIcon(R.drawable.ic_mic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        // Android 14+ (API 34) throws if RECORD_AUDIO permission is not yet granted
        // when calling startForeground with FOREGROUND_SERVICE_TYPE_MICROPHONE.
        // Fall back to a plain foreground notification so the service still runs
        // and keeps the WebView alive — the mic permission dialog will appear separately.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } catch (Exception e) {
                startForeground(NOTIF_ID, notification);
            }
        } else {
            startForeground(NOTIF_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
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
                "Sala de Voz",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Activo mientras usas una sala de voz");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.setSound(null, null);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
