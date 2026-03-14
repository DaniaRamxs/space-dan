import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useReactionEngine
 * Central engine for GIF overlays, emoji storms, and reaction timeline.
 * 
 * Usage:
 *   const {
 *     gifOverlays, isStorming,
 *     addGifOverlay, sendReaction,
 *     reactionBuffer, clearReactions
 *   } = useReactionEngine({ room, supabaseChannel });
 */

const MAX_OVERLAYS = 5;
const MAX_BUFFER = 15;
const GIF_TIMEOUT_MS = 4000;
const STORM_WINDOW_MS = 2000;
const STORM_THRESHOLD = 5;
const MAX_STORMS_PER_MIN = 3;

export function useReactionEngine({ room = null, supabaseChannel = null, getVideoTimestamp } = {}) {
    const [gifOverlays, setGifOverlays] = useState([]);
    const [reactionBuffer, setReactionBuffer] = useState([]);
    const [isStorming, setIsStorming] = useState(false);

    const stormTimestampsRef = useRef([]);
    const gifTimeoutsRef = useRef({});

    // ── Listen to Colyseus "reaction" messages safely ─────────────────────────
    useEffect(() => {
        if (!room) return;

        const handler = (data) => {
            if (data.type === 'gif' && data.content) {
                addGifOverlay(data.content);
            }
        };

        room.onMessage('reaction', handler);

        return () => {
            // Colyseus v0.15+: use off() for cleanup — never treat return value as unsubscribe fn
            room.off('reaction', handler);
        };
    }, [room]);

    // ── Storm detection ───────────────────────────────────────────────────────
    useEffect(() => {
        const now = Date.now();
        const recent = reactionBuffer.filter(t => now - t < STORM_WINDOW_MS);

        if (recent.length >= STORM_THRESHOLD && !isStorming) {
            const oneMinuteAgo = now - 60000;
            stormTimestampsRef.current = stormTimestampsRef.current.filter(t => t > oneMinuteAgo);

            if (stormTimestampsRef.current.length < MAX_STORMS_PER_MIN) {
                setIsStorming(true);
                stormTimestampsRef.current.push(now);
                setTimeout(() => setIsStorming(false), 5000);
            }
        }
    }, [reactionBuffer, isStorming]);

    // ── Cleanup gif timeouts on unmount ───────────────────────────────────────
    useEffect(() => {
        return () => {
            Object.values(gifTimeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    // ── addGifOverlay ─────────────────────────────────────────────────────────
    const addGifOverlay = useCallback((gifUrl) => {
        const id = Date.now() + Math.random();
        const newGif = { id, url: gifUrl };

        setGifOverlays(prev => [...prev.slice(-(MAX_OVERLAYS - 1)), newGif]);
        setReactionBuffer(prev => [...prev.slice(-MAX_BUFFER), Date.now()]);

        // Safe setTimeout — pass function reference, NOT a call
        const timeoutId = setTimeout(() => {
            setGifOverlays(prev => prev.filter(g => g.id !== id));
            delete gifTimeoutsRef.current[id];
        }, GIF_TIMEOUT_MS);

        gifTimeoutsRef.current[id] = timeoutId;
    }, []);

    // ── sendReaction (sends to Colyseus + Supabase broadcast) ─────────────────
    const sendReaction = useCallback(({ type, content, gifUrl, supabaseMeta }) => {
        const videoTimestamp = getVideoTimestamp?.() ?? 0;

        // Send to Colyseus for persistent timeline
        if (room) {
            room.send('reaction', { type, content: content || gifUrl, videoTimestamp });
        }

        // If it's a GIF, also broadcast via Supabase and show locally
        if (type === 'gif' && gifUrl) {
            addGifOverlay(gifUrl);

            if (supabaseChannel) {
                const payload = {
                    type: 'broadcast',
                    event: 'chat_message',
                    payload: {
                        id: Date.now(),
                        type: 'gif',
                        gifUrl,
                        videoTimestamp,
                        ...supabaseMeta
                    }
                };
                supabaseChannel.send(payload).catch(() => {});
            }
        }
    }, [room, supabaseChannel, addGifOverlay, getVideoTimestamp]);

    return {
        gifOverlays,
        isStorming,
        reactionBuffer,
        addGifOverlay,
        sendReaction
    };
}
