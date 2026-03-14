import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useReactionEngine
 * Central engine for GIF overlays, emoji storms, and reaction timeline.
 *
 * Fixes applied:
 *  - room.off() does NOT exist in Colyseus → use room.removeListener() with guard
 *  - crypto.randomUUID() for IDs instead of Date.now()+Math.random() (collision-safe)
 *  - getVideoTimestamp wrapped in try/catch (player may be destroyed mid-change)
 *  - storm detection is purely imperative (avoids useState-driven useEffect loops)
 *  - listener registered once per room instance ([room] only in dep array)
 */

const MAX_OVERLAYS = 5;
const GIF_TIMEOUT_MS = 4000;
const STORM_WINDOW_MS = 2000;
const STORM_THRESHOLD = 5;
const MAX_STORMS_PER_MIN = 3;
const STORM_DURATION_MS = 5000;

export function useReactionEngine({ room = null, getVideoTimestamp } = {}) {
    // ── Rendered state (minimal to avoid player re-renders) ───────────────────
    const [gifOverlays, setGifOverlays] = useState([]);
    const [isStorming, setIsStorming] = useState(false);

    // ── Refs (mutations here do NOT trigger renders) ──────────────────────────
    const gifTimeoutsRef     = useRef({});   // id → timeoutId for overlay auto-removal
    const reactionBufferRef  = useRef([]);   // timestamps of recent reactions (no re-renders)
    const stormTimestampsRef = useRef([]);   // timestamps of triggered storms
    const isStormingRef      = useRef(false);// mirror of isStorming to avoid stale closures

    // Keep ref in sync with state (runs after render, safe)
    useEffect(() => { isStormingRef.current = isStorming; }, [isStorming]);

    // ── Cleanup all gif timeouts on unmount ───────────────────────────────────
    useEffect(() => {
        return () => {
            Object.values(gifTimeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    // ── Storm detection (imperative — no useEffect dependency on buffer) ──────
    const checkStorm = useCallback(() => {
        const now = Date.now();

        // Prune to only the recent window
        reactionBufferRef.current = reactionBufferRef.current.filter(
            t => now - t < STORM_WINDOW_MS
        );

        if (reactionBufferRef.current.length >= STORM_THRESHOLD && !isStormingRef.current) {
            const oneMinuteAgo = now - 60_000;
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

    // ── addGifOverlay — stable reference, safe for use in useEffect ───────────
    const addGifOverlay = useCallback((gifUrl) => {
        if (!gifUrl) return;

        // FIX: crypto.randomUUID() instead of Date.now()+Math.random()
        // Date.now()+Math.random() can collide in rapid storms
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;

        const newGif = { id, url: gifUrl };

        setGifOverlays(prev => [...prev.slice(-(MAX_OVERLAYS - 1)), newGif]);

        // Buffer reaction timestamp imperatively (no setState → zero extra renders)
        reactionBufferRef.current.push(Date.now());
        checkStorm();

        // Safe: pass function reference, never call immediately
        const timeoutId = setTimeout(() => {
            setGifOverlays(prev => prev.filter(g => g.id !== id));
            delete gifTimeoutsRef.current[id];
        }, GIF_TIMEOUT_MS);

        gifTimeoutsRef.current[id] = timeoutId;
    }, [checkStorm]);

    // ── Colyseus reaction listener ────────────────────────────────────────────
    // FIX: Colyseus v0.15 does NOT have room.off() → use room.removeListener()
    // with a safety guard to avoid crashes if room object changes shape.
    //
    // dep array: [room] ONLY
    // addGifOverlay is stable (useCallback with [checkStorm])
    // checkStorm is stable (useCallback with [])
    // Adding other deps here would re-register the listener on every render → duplicate handlers
    useEffect(() => {
        if (!room) return;

        const handler = (data) => {
            if (data?.type === 'gif' && data.content) {
                addGifOverlay(data.content);
            } else if (data?.type === 'emoji') {
                // Emoji reactions feed storm detection only
                reactionBufferRef.current.push(Date.now());
                checkStorm();
            }
        };

        room.onMessage('reaction', handler);

        return () => {
            // FIX: room.off() ← does NOT exist in Colyseus, crashes on cleanup
            // Use removeListener() with guard for safety
            if (typeof room?.removeListener === 'function') {
                room.removeListener('reaction', handler);
            }
        };
    }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── sendReaction ─────────────────────────────────────────────────────────
    const sendReaction = useCallback(({ type, content, gifUrl, supabaseChannel, supabaseMeta } = {}) => {
        // FIX: wrap in try/catch — player may be destroyed right as video changes
        let videoTimestamp = 0;
        try {
            videoTimestamp = getVideoTimestamp?.() ?? 0;
        } catch {
            videoTimestamp = 0;
        }

        const payload = { type, content: content || gifUrl, videoTimestamp };

        // 1. Send to Colyseus → timeline persistence + remote overlays for others
        if (room) {
            room.send('reaction', payload);
        }

        // 2. GIFs: show locally + Supabase broadcast for redundancy
        if (type === 'gif' && gifUrl) {
            addGifOverlay(gifUrl);

            if (supabaseChannel) {
                supabaseChannel.send({
                    type: 'broadcast',
                    event: 'chat_message',
                    payload: {
                        id: typeof crypto !== 'undefined' && crypto.randomUUID
                            ? crypto.randomUUID()
                            : Date.now(),
                        type: 'gif',
                        gifUrl,
                        videoTimestamp,
                        ...supabaseMeta
                    }
                }).catch(() => {});
            }
        }
    }, [room, addGifOverlay, getVideoTimestamp]);

    return {
        gifOverlays,
        isStorming,
        addGifOverlay,
        sendReaction
    };
}
