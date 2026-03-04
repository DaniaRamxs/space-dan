
import { useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { activityService } from '../../services/activityService';
import { missionService } from '../../services/missionService';

/**
 * Componente silencioso que rastrea el tiempo en la sala de voz
 * y otorga XP de actividad periódicamente.
 */
export default function VoiceActivityTracker() {
    const { isMicrophoneEnabled } = useLocalParticipant();

    useEffect(() => {
        // Otorgar 10 XP cada 2 minutos de permanencia
        const interval = setInterval(async () => {
            try {
                await activityService.awardActivityXP(10, 'voice_time');
                // Misión: Eco Galáctico (10 mins en voz)
                // 2 units * (10 / 2) = 10 units. En 10 mins se llega al target de 10.
                missionService.updateProgress('social', 2, 'voice_10').catch(() => { });
                console.log('[VoiceActivity] XP y progreso de misión otorgados');
            } catch (err) {
                console.error('[VoiceActivity] Error awarding XP:', err);
            }
        }, 120000); // 2 minutos

        return () => clearInterval(interval);
    }, []);

    return null;
}
