import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useReactionEngine
 * Central engine for GIF overlays, emoji storms, and reaction timeline.
 * 
 * Design principles:
 *  - reaction buffer uses useRef (not useState) → NO extra renders on every reaction
 *  - storm detection runs imperatively → NO useEffect dependency on mutable buffer
 *  - Colyseus listener registered once per room instance (dep array: [room] only)
 *  - All timeouts are tracked and cleared on unmount → no memory leaks
 * 
 * Usage:
 *   const { gifOverlays, isStorming, addGifOverlay, sendReaction } =
 *     useReactionEngine({ room, getVideoTimestamp });
 */

const MAX_OVERLAYS = 5;
const GIF_TIMEOUT_MS = 4000;
const STORM_WINDOW_MS = 2000;
const STORM_THRESHOLD = 5;
const MAX_STORMS_PER_MIN = 3;
const STORM_DURATION_MS = 5000;

export function useReactionEngine({ room = null, getVideoTimestamp } = {}) {
    // ── Rendered state (kept minimal to avoid player re-renders) ──────────────
    const [gifOverlays, setGifOverlays] = useState([]);
    const [isStorming, setIsStorming] = useState(false);

    // ── Refs (mutations here do NOT trigger renders) ──────────────────────────
    const gifTimeoutsRef = useRef({});          // id → timeoutId for overlay cleanup
    const reactionBufferRef = useRef([]);        // timestamps of recent reactions
    const stormTimestampsRef = useRef([]);       // timestamps of triggered storms
    const isStormingRef = useRef(false);         // mirror of isStorming, avoids stale closure

    // Keep ref in sync with state
    useEffect(() => { isStormingRef.current = isStorming; }, [isStorming]);

    // ── Cleanup all timeouts on unmount ───────────────────────────────────────
    useEffect(() => {
        return () => {
            Object.values(gifTimeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    // ── Storm detection (imperative — called when a reaction arrives) ─────────
    const checkStorm = useCallback(() => {
        const now = Date.now();

        // Prune buffer to only keep recent reactions
        reactionBufferRef.current = reactionBufferRef.current.filter(
            t => now - t < STORM_WINDOW_MS
        );

        if (reactionBufferRef.current.length >= STORM_THRESHOLD && !isStormingRef.current) {
            // Prune old storm timestamps
            const oneMinuteAgo = now - 60000;
            stormTimestampsRef.current = stormTimestampsRef.current.filter(t => t > oneMinuteAgo);

            if (stormTimestampsRef.current.length < MAX_STORMS_PER_MIN) {
                isStormingRef.current = true;
                setIsStorming(true);
                stormTimestampsRef.current.push(now);

                setTimeout(() => {
                    isStormingRef.current = false;
                    setIsStorming(false);
                }, STORM_DURATION_MS);
            }
        }
    }, []);

    // ── addGifOverlay — safe, stable reference ────────────────────────────────
    const addGifOverlay = useCallback((gifUrl) => {
        if (!gifUrl) return;

        const id = Date.now() + Math.random();
        const newGif = { id, url: gifUrl };

        // Keep max 5 simultaneously to avoid DOM storms
        setGifOverlays(prev => [...prev.slice(-(MAX_OVERLAYS - 1)), newGif]);

        // Buffer reaction timestamp imperatively (no setState → no extra render)
        reactionBufferRef.current.push(Date.now());
        checkStorm();

        // Safe auto-removal: pass reference, never () => fn()
        const timeoutId = setTimeout(() => {
            setGifOverlays(prev => prev.filter(g => g.id !== id));
            delete gifTimeoutsRef.current[id];
        }, GIF_TIMEOUT_MS);

        gifTimeoutsRef.current[id] = timeoutId;
    }, [checkStorm]);

    // ── Listen to Colyseus "reaction" messages ────────────────────────────────
    // IMPORTANT: dep array is [room] ONLY — addGifOverlay is stable (useCallback with [])
    // Adding other deps here would re-register the listener on every render → duplicate handlers
    useEffect(() => {
        if (!room) return;

        const handler = (data) => {
            if (data?.type === 'gif' && data.content) {
                addGifOverlay(data.content);
            } else if (data?.type === 'emoji' && data.content) {
                // Emoji reactions update the buffer for storm detection only
                reactionBufferRef.current.push(Date.now());
                checkStorm();
            }
        };

        room.onMessage('reaction', handler);

        // Colyseus v0.15+: always use off() — onMessage() does NOT return an unsubscribe fn
        return () => {
            room.off('reaction', handler);
        };
    }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── sendReaction — sends to Colyseus + optional Supabase channel ──────────
    const sendReaction = useCallback(({ type, content, gifUrl, supabaseChannel, supabaseMeta } = {}) => {
        const videoTimestamp = getVideoTimestamp?.() ?? 0;
        const payload = { type, content: content || gifUrl, videoTimestamp };

        // 1. Send to Colyseus → triggers timeline persistence + remote overlays
        if (room) {
            room.send('reaction', payload);
        }

        // 2. GIFs: also broadcast through Supabase for users who may miss Colyseus
        if (type === 'gif' && gifUrl) {
            // Show locally immediately
            addGifOverlay(gifUrl);

            if (supabaseChannel) {
                supabaseChannel.send({
                    type: 'broadcast',
                    event: 'chat_message',
                    payload: {
                        id: Date.now(),
                        type: 'gif',
                        gifUrl,
                        videoTimestamp,
                        ...supabaseMeta
                    }
                }).catch(() => {});
            }
        }
    }, [room, addGifOverlay, getVideoTimestamp]); // supabaseChannel intentionally omitted — passed at call site

    return {
        gifOverlays,
        isStorming,
        addGifOverlay,
        sendReaction
    };
}
