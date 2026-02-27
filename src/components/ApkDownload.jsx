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
                        <h3>¡Lleva el Dan-Space a tu bolsillo!</h3>
                        <p>
                            Descarga la app oficial para una experiencia más fluida
                            y notificaciones en tiempo real.
                        </p>
                        <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                            v1.1 • Chat global + corrección de bugs • 114 MB
                        </p>
                    </div>
                </div>
                <a
                    href="https://github.com/DaniaRamxs/space-dan/releases/download/v1.1/spacedan.apk"
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