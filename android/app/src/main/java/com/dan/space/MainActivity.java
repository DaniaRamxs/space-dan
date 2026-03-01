package com.dan.space;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(VoiceServicePlugin.class);
        registerPlugin(RadioServicePlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Cuando la app pasa a segundo plano, Capacitor llama webView.onPause() que
     * dispara visibilitychange → el navegador pausa el audio HTML5.
     * Si la radio está activa, reanudamos el WebView inmediatamente para que
     * el streaming de audio no se interrumpa.
     */
    @Override
    public void onPause() {
        super.onPause();
        if (RadioService.isRunning) {
            try {
                getBridge().getWebView().onResume();
            } catch (Exception ignored) {}
        }
    }
}
