import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook global para controlar la reproducción de previews de Spotify.
 * Garantiza que solo suene una canción a la vez en todo el feed.
 */
let globalAudio = null;
let activeTrackId = null;
let listeners = [];

const notifyListeners = () => {
    listeners.forEach(l => l({ activeTrackId, isPlaying: globalAudio ? !globalAudio.paused : false }));
};

export const useAudioController = (trackId, previewUrl) => {
    const [isPlaying, setIsPlaying] = useState(activeTrackId === trackId && globalAudio && !globalAudio.paused);
    const progressRef = useRef(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handler = (state) => {
            if (activeTrackId === trackId) {
                setIsPlaying(state.isPlaying);
            } else {
                setIsPlaying(false);
            }
        };
        listeners.push(handler);
        return () => {
            listeners = listeners.filter(l => l !== handler);
        };
    }, [trackId]);

    useEffect(() => {
        if (!globalAudio) return;

        const updateProgress = () => {
            if (activeTrackId === trackId && globalAudio) {
                const p = (globalAudio.currentTime / globalAudio.duration) * 100;
                setProgress(p);
            }
        };

        if (isPlaying) {
            globalAudio.addEventListener('timeupdate', updateProgress);
        }
        return () => {
            if (globalAudio) globalAudio.removeEventListener('timeupdate', updateProgress);
        };
    }, [isPlaying, trackId]);

    const togglePlay = useCallback(() => {
        if (!previewUrl) return;

        if (activeTrackId === trackId && globalAudio) {
            if (globalAudio.paused) {
                globalAudio.play().catch(err => {
                    console.error('Audio playback failed:', err);
                    alert('No se pudo iniciar la reproducción. Intenta interactuar primero con la página.');
                });
            } else {
                globalAudio.pause();
            }
        } else {
            // Detener anterior
            if (globalAudio) {
                globalAudio.pause();
                globalAudio.src = '';
            }

            // Crear nuevo
            globalAudio = new Audio(previewUrl);
            globalAudio.volume = 0.4; // Volumen moderado Spacely
            activeTrackId = trackId;
            globalAudio.play().catch(err => {
                console.error('Initial audio playback failed:', err);
                alert('No se pudo iniciar la reproducción. Intenta interactuar primero con la página.');
            });

            globalAudio.onended = () => {
                activeTrackId = null;
                notifyListeners();
            };
        }
        notifyListeners();
    }, [trackId, previewUrl]);

    return {
        isPlaying,
        togglePlay,
        progress
    };
};
