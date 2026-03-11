import { useState, useEffect, useRef, useCallback } from 'react';

// Mapa de estados del player de YouTube
const YT_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

/**
 * useYouTubePlayer - Hook personalizado para manejar el reproductor de YouTube
 * Maneja la inicialización, reproducción y sincronización del player
 */
export default function useYouTubePlayer({
    videoId,
    isPlaying,
    volume,
    onStateChange,
    onReady
}) {
    const playerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    // Cargar SDK de YouTube
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(tag, firstScript);
        }

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.log('[YT Player] Error al destruir:', e);
                }
                playerRef.current = null;
            }
        };
    }, []);

    // Inicializar o actualizar player
    useEffect(() => {
        if (!videoId) return;

        const handleYTReady = () => {
            if (!window.YT?.Player) return;

            try {
                if (playerRef.current) {
                    // Player existe - solo cambiar video
                    playerRef.current.loadVideoById(videoId);
                    return;
                }

                // Crear nuevo player
                playerRef.current = new window.YT.Player('yt-player-jukebox', {
                    height: '0',
                    width: '0',
                    videoId: videoId,
                    playerVars: {
                        autoplay: isPlaying ? 1 : 0,
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        rel: 0,
                        modestbranding: 1,
                    },
                    events: {
                        onReady: (e) => {
                            setIsReady(true);
                            e.target.setVolume(volume);
                            if (isPlaying) {
                                e.target.playVideo();
                            }
                            onReady?.(e.target);
                        },
                        onStateChange: (e) => {
                            onStateChange?.(e.data, playerRef.current);
                        },
                        onError: (e) => {
                            console.error('[YT Player] Error:', e.data);
                            setError(e.data);
                        }
                    },
                });
            } catch (err) {
                console.error('[YT Player] Error al crear:', err);
                setError(err);
            }
        };

        if (window.YT?.Player) {
            handleYTReady();
        } else {
            window.onYouTubeIframeAPIReady = handleYTReady;
        }

        return () => {
            if (window.onYouTubeIframeAPIReady === handleYTReady) {
                delete window.onYouTubeIframeAPIReady;
            }
        };
    }, [videoId]);

    // Controlar reproducción/pausa
    useEffect(() => {
        const player = playerRef.current;
        if (!player?.playVideo) return;

        if (isPlaying) {
            player.playVideo();
            // Reintentar si es necesario
            setTimeout(() => {
                if (player.getPlayerState?.() !== YT_STATE.PLAYING) {
                    player.playVideo();
                }
            }, 500);
        } else {
            player.pauseVideo();
        }
    }, [isPlaying]);

    // Controlar volumen
    useEffect(() => {
        const player = playerRef.current;
        if (player?.setVolume) {
            player.setVolume(volume);
        }
    }, [volume]);

    // Helpers
    const seekTo = useCallback((seconds) => {
        playerRef.current?.seekTo?.(seconds, true);
    }, []);

    const getCurrentTime = useCallback(() => {
        return playerRef.current?.getCurrentTime?.() || 0;
    }, []);

    const getDuration = useCallback(() => {
        return playerRef.current?.getDuration?.() || 1;
    }, []);

    const getPlayerState = useCallback(() => {
        return playerRef.current?.getPlayerState?.() || YT_STATE.UNSTARTED;
    }, []);

    return {
        playerRef,
        isReady,
        error,
        seekTo,
        getCurrentTime,
        getDuration,
        getPlayerState,
    };
}
