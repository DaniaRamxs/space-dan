
import { useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { activityService } from '../../services/activityService';

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
                console.log('[VoiceActivity] XP otorgada por tiempo en sala');
            } catch (err) {
                console.error('[VoiceActivity] Error awarding XP:', err);
            }
        }, 120000); // 2 minutos

        return () => clearInterval(interval);
    }, []);

    return null;
}
