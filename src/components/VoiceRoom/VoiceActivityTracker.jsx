/**
 * VoiceActivityTracker.jsx
 * Componente silencioso (sin UI) que rastrea el tiempo real del usuario en voz
 * y otorga XP periódicamente según el estado de su micrófono.
 *
 * Lógica:
 *   - Con micrófono activo → 15 XP cada 2 minutos (participación activa)
 *   - Con micrófono mudo   →  5 XP cada 2 minutos (solo escuchando)
 *   - Progreso de misión "Eco Galáctico" (voice_10): 10 min en voz = completada
 *
 * Este componente DEBE estar dentro de <LiveKitRoom> para tener acceso
 * a los hooks de LiveKit (useLocalParticipant).
 */

import { useEffect, useRef } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { activityService } from '../../services/activityService';
import { missionService } from '../../services/missionService';

// ─── Constantes de configuración ────────────────────────────────────────────
const INTERVAL_MS     = 120_000; // Cada 2 minutos
const XP_MIC_ACTIVE   = 15;      // XP cuando el micrófono está encendido
const XP_MIC_MUTED    = 5;       // XP cuando el micrófono está silenciado
const MISSION_ID      = 'voice_10'; // ID de la misión "Eco Galáctico"
const MISSION_UNITS   = 2;        // Unidades de misión por tick (2 ticks × 5 = 10 min)

// ─── Componente ─────────────────────────────────────────────────────────────

export default function VoiceActivityTracker() {
    // isMicrophoneEnabled: true cuando el micro está activo y transmitiendo
    const { isMicrophoneEnabled } = useLocalParticipant();

    // Ref para leer el estado actual del micro dentro del interval sin causar
    // re-renderizados ni tener que reiniciar el intervalo cada vez que cambia.
    const micRef = useRef(isMicrophoneEnabled);
    useEffect(() => {
        micRef.current = isMicrophoneEnabled;
    }, [isMicrophoneEnabled]);

    useEffect(() => {
        const interval = setInterval(async () => {
            // Leer estado actual del micrófono desde el ref (sin re-render)
            const micActive = micRef.current;
            const xp = micActive ? XP_MIC_ACTIVE : XP_MIC_MUTED;

            try {
                // Otorgar XP de actividad (fire-and-forget con manejo de error)
                await activityService.awardActivityXP(xp, 'voice_time');

                // Actualizar progreso de la misión "Eco Galáctico"
                // No bloqueamos si falla — la misión es secundaria
                missionService
                    .updateProgress('social', MISSION_UNITS, MISSION_ID)
                    .catch(() => { });

                console.debug(
                    `[VoiceTracker] +${xp} XP otorgados | mic: ${micActive ? 'activo' : 'mudo'}`
                );
            } catch (err) {
                // Error al otorgar XP — no es crítico, solo loguear
                console.warn('[VoiceTracker] Error al otorgar XP:', err?.message);
            }
        }, INTERVAL_MS);

        // Cleanup: cancelar intervalo al salir de la sala o desmontar
        return () => {
            clearInterval(interval);
            console.debug('[VoiceTracker] Tracker detenido.');
        };
    }, []); // Sin dependencias — el intervalo se crea una vez y lee mic por ref

    // Este componente no renderiza nada visible
    return null;
}
