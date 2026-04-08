import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

const SYNC_INTERVAL_MS = 4000;

/**
 * useJukeboxSync - Hook para sincronización de cola y reproducción via Supabase
 * Maneja broadcast de estado entre participantes de la sala
 */
export default function useJukeboxSync({ roomName, user, isHost }) {
    const channelRef = useRef(null);
    const [queue, setQueue] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [syncError, setSyncError] = useState(null);

    // Inicializar canal de Supabase
    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `jukebox-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(chanName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
                setQueue(payload.queue ?? []);
                if (payload.currentTrack !== undefined) {
                    const prevId = currentTrack?.id;
                    if (payload.currentTrack?.id !== prevId) {
                        setCurrentTrack(payload.currentTrack);
                        setProgress(0);
                    }
                }
            })
            .on('broadcast', { event: 'playback_update' }, ({ payload }) => {
                setIsPlaying(payload.isPlaying);
                if (payload.progress !== undefined) {
                    setProgress(payload.progress);
                }
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    setSyncError('Error de conexión con el canal');
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [roomName, user?.id]);

    // Broadcast de cola
    const broadcastQueue = useCallback((newQueue, track = currentTrack) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'queue_update',
            payload: { queue: newQueue, currentTrack: track },
        });
    }, [currentTrack]);

    // Broadcast de reproducción
    const broadcastPlayback = useCallback((playing, prog = progress) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'playback_update',
            payload: { isPlaying: playing, progress: prog },
        });
    }, [progress]);

    // Emisión periódica de progreso (solo host)
    useEffect(() => {
        if (!isHost) return;

        const interval = setInterval(() => {
            // El progreso se actualiza desde el componente principal
        }, SYNC_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isHost]);

    return {
        queue,
        setQueue,
        currentTrack,
        setCurrentTrack,
        isPlaying,
        setIsPlaying,
        progress,
        setProgress,
        broadcastQueue,
        broadcastPlayback,
        channelRef,
        syncError,
    };
}
