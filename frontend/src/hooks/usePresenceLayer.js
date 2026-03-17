/**
 * usePresenceLayer
 *
 * Wires presence signals between the SpaceSession Colyseus room and the UI:
 *   - Cursor positions (% coords, broadcasted throttled)
 *   - User soft-state ("escribiendo", "viendo anime", etc.)
 *   - Floating emoji reactions
 *
 * Returns everything needed to render cursors + reactions on top of the space.
 * This hook is ONLY active inside a SpaceSessionPage — zero impact elsewhere.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// How often to sample mouse position and send (ms)
const CURSOR_SEND_INTERVAL = 60;

export function usePresenceLayer(room, containerRef) {
  const [cursors,   setCursors]   = useState({}); // sessionId → { userId, username, avatar, x, y }
  const [reactions, setReactions] = useState([]); // [{ id, userId, username, emoji, x? }]
  const [userStates, setUserStates] = useState({}); // userId → statusText

  const sendIntervalRef = useRef(null);
  const pendingCursor   = useRef(null); // latest mouse position waiting to be sent

  // ── Listen for incoming presence events ───────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const unsubCursor = room.onMessage('CURSOR_UPDATE', (data) => {
      setCursors(prev => ({ ...prev, [data.sessionId]: data }));
    });

    const unsubCursorGone = room.onMessage('CURSOR_GONE', ({ sessionId }) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    });

    const unsubState = room.onMessage('USER_STATE_UPDATE', ({ userId, status }) => {
      setUserStates(prev => ({ ...prev, [userId]: status }));
    });

    const unsubReaction = room.onMessage('REACTION_POP', (data) => {
      const id = `${data.userId}-${data.timestamp}`;
      // Scatter x position randomly so reactions don't all overlap
      const x = 10 + Math.random() * 80;
      setReactions(prev => [...prev.slice(-12), { ...data, id, x }]);
      // Auto-remove after animation
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 2400);
    });

    return () => {
      if (typeof unsubCursor   === 'function') unsubCursor();
      if (typeof unsubCursorGone === 'function') unsubCursorGone();
      if (typeof unsubState    === 'function') unsubState();
      if (typeof unsubReaction === 'function') unsubReaction();
    };
  }, [room]);

  // ── Send cursor position on mouse move ────────────────────────────────────

  useEffect(() => {
    if (!room || !containerRef?.current) return;

    const container = containerRef.current;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      pendingCursor.current = { x, y };
    };

    container.addEventListener('mousemove', onMouseMove, { passive: true });

    // Throttled send loop
    sendIntervalRef.current = setInterval(() => {
      if (!pendingCursor.current) return;
      room.send('CURSOR_MOVE', pendingCursor.current);
      pendingCursor.current = null;
    }, CURSOR_SEND_INTERVAL);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      clearInterval(sendIntervalRef.current);
    };
  }, [room, containerRef?.current]);

  // ── Outbound controls ──────────────────────────────────────────────────────

  const sendUserState = useCallback((statusText) => {
    room?.send('USER_STATE', statusText);
  }, [room]);

  const sendReaction = useCallback((emoji) => {
    room?.send('REACTION', emoji);
  }, [room]);

  return {
    cursors:    Object.values(cursors),
    reactions,
    userStates,
    sendUserState,
    sendReaction,
  };
}
