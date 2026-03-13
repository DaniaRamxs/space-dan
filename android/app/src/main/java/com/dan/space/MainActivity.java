package com.dan.space;

import android.os.Handler;
import android.os.Looper;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(VoiceServicePlugin.class);
        registerPlugin(RadioServicePlugin.class);

        // Habilitar soporte para compartir pantalla (getDisplayMedia) en la WebView
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Conceder automáticamente si son permisos multimedia solicitados por la WebView
                        request.grant(request.getResources());
                    }
                });
            }
        });
    }

    /**
     * onPause y onStop llaman internamente a webView.onPause(), lo que dispara
     * visibilitychange en JS y pausa el audio HTML5.
     * Si la radio está activa, diferimos webView.onResume() con Handler.post()
     * para que se ejecute DESPUÉS de que el ciclo de pausa termine, evitando
     * el conflicto de estado que causaba el crash.
     */

    @Override
    public void onPause() {
        super.onPause();
        if (RadioService.isRunning) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    getBridge().getWebView().onResume();
                } catch (Exception ignored) {}
            });
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (RadioService.isRunning) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    getBridge().getWebView().onResume();
                } catch (Exception ignored) {}
            });
        }
    }
}

