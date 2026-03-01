package com.dan.space;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(VoiceServicePlugin.class);
        registerPlugin(RadioServicePlugin.class);
        super.onCreate(savedInstanceState);
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
