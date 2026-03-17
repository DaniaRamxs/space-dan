/**
 * useOverlaySync — bridges Colyseus MapSchema state and ghost-cursor messages
 * into the local overlay state managed by OverlayContext.
 *
 * Strategy:
 *   - Elements come from schema onStateChange (authoritative, server-pushed diffs)
 *   - Ghost cursors come from overlay:ghost broadcast messages (transient, no schema)
 *   - Drag preview is local-only; final position is sent on drag-end via overlay:update
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const DRAG_THROTTLE_MS = 100;

/**
 * Convert a Colyseus MapSchema<OverlayElement> to a plain array.
 * Reads each entry as a plain object so React diffing works normally.
 */
function mapSchemaToArray(map) {
  const arr = [];
  map.forEach((el, id) => {
    arr.push({
      id:           id,
      type:         el.type         ?? '',
      src:          el.src          ?? '',
      text:         el.text         ?? '',
      position:     { x: el.x ?? 0, y: el.y ?? 0 },
      scale:        el.scale        ?? 1,
      rotation:     el.rotation     ?? 0,
      zIndex:       el.zIndex       ?? 1,
      isPersistent: el.isPersistent ?? false,
      createdBy:    el.createdBy    ?? '',
      createdAt:    el.createdAt    ?? 0,
      updatedAt:    el.updatedAt    ?? 0,
      width:        el.width        ?? 0,
      height:       el.height       ?? 0,
    });
  });
  return arr;
}

/**
 * @param {{ room: any, userId: string, isHost: boolean }} opts
 * @returns {{
 *   elements:     import('../contexts/OverlayContext').OverlayElement[],
 *   ghosts:       Record<string, { id: string, userId: string, username: string, x: number, y: number }>,
 *   add:          (type: string, extra?: object) => void,
 *   update:       (id: string, patch: object) => void,
 *   remove:       (id: string) => void,
 *   clear:        () => void,
 *   sendDragging: (id: string, x: number, y: number) => void,
 * }}
 */
export function useOverlaySync({ room, userId, isHost }) {
  const [elements, setElements] = useState([]);
  const [ghosts, setGhosts]     = useState({});

  const dragThrottleRef = useRef({}); // id → lastMs

  // ── State sync from Colyseus schema ───────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    // Initial sync + subscribe to future diffs
    const unsubState = room.onStateChange((state) => {
      if (!state?.overlays) return;
      setElements(mapSchemaToArray(state.overlays));
    });

    // Trigger an initial read if state already exists
    if (room.state?.overlays) {
      setElements(mapSchemaToArray(room.state.overlays));
    }

    return () => {
      if (typeof unsubState === 'function') unsubState();
    };
  }, [room]);

  // ── Ghost cursor messages ──────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const unsubGhost = room.onMessage('overlay:ghost', ({ id, userId: uid, username, x, y }) => {
      setGhosts(prev => ({
        ...prev,
        [uid]: { id, userId: uid, username, x, y, ts: Date.now() },
      }));
    });

    return () => {
      if (typeof unsubGhost === 'function') unsubGhost();
    };
  }, [room]);

  // Expire stale ghost cursors (1.5s no update → remove)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setGhosts(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(uid => {
          if (now - next[uid].ts > 1500) { delete next[uid]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const send = useCallback((type, payload) => {
    if (!room) return;
    try { room.send(type, payload); }
    catch (err) { console.warn('[useOverlaySync] send failed:', err); }
  }, [room]);

  const add = useCallback((type, extra = {}) => {
    const id = crypto.randomUUID();
    send('overlay:add', { id, type, createdBy: userId, ...extra });
  }, [send, userId]);

  const update = useCallback((id, patch) => {
    send('overlay:update', { id, patch });
  }, [send]);

  const remove = useCallback((id) => {
    send('overlay:remove', { id });
  }, [send]);

  const clear = useCallback(() => {
    if (!isHost) return;
    send('overlay:clear', {});
  }, [send, isHost]);

  const sendDragging = useCallback((id, x, y) => {
    const now = Date.now();
    const last = dragThrottleRef.current[id] ?? 0;
    if (now - last < DRAG_THROTTLE_MS) return;
    dragThrottleRef.current[id] = now;
    send('overlay:dragging', { id, x, y });
  }, [send]);

  return { elements, ghosts, add, update, remove, clear, sendDragging };
}
