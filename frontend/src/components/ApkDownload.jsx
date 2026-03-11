import React from 'react';
import './ApkDownload.css';

export default function ApkDownload() {
    return (
        <div className="apkSection">
            <div className="apkCard">
                <div className="apkBadge">VERSION ANDROID</div>
                <div className="apkContent">
                    <div className="apkIcon">🤖</div>
                    <div className="apkText">
                        <h3>¡Lleva el espacio a tu bolsillo!</h3>
                        <p>
                            Descarga la app oficial para una experiencia más fluida
                            y nueva integracion con spotify.
                        </p>
                        <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                            <v1 className="3 4"></v1> • 10+ juegos nuevos · mejoras de optimizacion · update spotify
                        </p>
                    </div>
                </div>
                <a
                    href="https://github.com/DaniaRamxs/space-dan/releases/download/v1.3.5/spacely1.3.5.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="apkDownloadBtn"
                >
                    DESCARGAR APK ✦
                    <span className="apkBtnGlow"></span>
                </a>
            </div>
        </div>
    );
}