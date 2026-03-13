package com.dan.space;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Obligatorio para Theme.SplashScreen (API 31+)
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // Registrar plugins locales
        registerPlugin(VoiceServicePlugin.class);
        registerPlugin(RadioServicePlugin.class);
    }
}
