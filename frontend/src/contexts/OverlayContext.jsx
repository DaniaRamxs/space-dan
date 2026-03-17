/**
 * OverlayContext — Room Overlay Engine
 *
 * Manages a collection of overlay elements (gifs, stickers, drawings, text)
 * layered on top of the space session.
 *
 * Elements are authoritative from Colyseus schema (via useOverlaySync).
 * Local UI state (editMode, graffitiMode, selectedId) lives here.
 * Ghost cursors from overlay:ghost messages are exposed as `ghosts`.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
} from 'react';
import { useOverlaySync } from '@/hooks/useOverlaySync';

// ─── Initial UI state ─────────────────────────────────────────────────────────

const INITIAL_UI = {
  editMode:     false,
  graffitiMode: false,
  selectedId:   null,
};

// ─── Action types ─────────────────────────────────────────────────────────────

const A = {
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  SET_GRAFFITI:  'SET_GRAFFITI',
  SET_SELECTED:  'SET_SELECTED',
};

// ─── Reducer (UI state only) ──────────────────────────────────────────────────

function uiReducer(state, action) {
  switch (action.type) {
    case A.SET_EDIT_MODE: return { ...state, editMode: action.value };
    case A.SET_GRAFFITI:  return { ...state, graffitiMode: action.value };
    case A.SET_SELECTED:  return { ...state, selectedId: action.id };
    default:              return state;
  }
}

// ─── Helpers for local-only zIndex operations ──────────────────────────────────
// These still send to server via update(); schema is authoritative on next patch.

function maxZ(elements) {
  return elements.reduce((m, el) => Math.max(m, el.zIndex ?? 0), 0);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OverlayContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * @param {{ children: React.ReactNode, spaceId: string, colyseusRoom: any, userId: string, isHost: boolean }} props
 */
export function OverlayProvider({ children, spaceId, colyseusRoom, userId, isHost }) {
  const [ui, dispatch] = useReducer(uiReducer, INITIAL_UI);

  // Elements + ghost cursors + server actions from schema sync hook
  const {
    elements,
    ghosts,
    add:          syncAdd,
    update:       syncUpdate,
    remove:       syncRemove,
    clear:        syncClear,
    sendDragging,
  } = useOverlaySync({ room: colyseusRoom, userId, isHost });

  // ── UI state actions ─────────────────────────────────────────────────────

  const setEditMode = useCallback((value) => dispatch({ type: A.SET_EDIT_MODE, value }), []);
  const setGraffiti = useCallback((value) => dispatch({ type: A.SET_GRAFFITI, value }), []);
  const setSelected = useCallback((id)    => dispatch({ type: A.SET_SELECTED, id }),   []);

  // ── Public overlay actions ────────────────────────────────────────────────

  const addOverlay = useCallback((type, extra = {}) => {
    syncAdd(type, extra);
  }, [syncAdd]);

  const updateOverlay = useCallback((id, patch) => {
    // Translate local { position: { x, y } } to server flat { x, y }
    if (patch.position) {
      const { x, y } = patch.position;
      const { position: _p, ...rest } = patch;
      syncUpdate(id, { ...rest, x, y });
    } else {
      syncUpdate(id, patch);
    }
  }, [syncUpdate]);

  const removeOverlay = useCallback((id) => syncRemove(id), [syncRemove]);

  const togglePin = useCallback((id) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    syncUpdate(id, { isPersistent: !el.isPersistent });
  }, [elements, syncUpdate]);

  const bringForward = useCallback((id) => {
    const topZ = maxZ(elements);
    syncUpdate(id, { zIndex: topZ + 1 });
  }, [elements, syncUpdate]);

  const sendBackward = useCallback((id) => {
    const minZ = elements.reduce((m, el) => Math.min(m, el.zIndex ?? 0), 0);
    syncUpdate(id, { zIndex: Math.max(0, minZ - 1) });
  }, [elements, syncUpdate]);

  const clearOverlays = useCallback(() => syncClear(), [syncClear]);

  // ── Memoized context value ────────────────────────────────────────────────

  const value = useMemo(() => ({
    // State
    elements,
    ghosts,
    editMode:     ui.editMode,
    graffitiMode: ui.graffitiMode,
    selectedId:   ui.selectedId,

    // Identity props
    userId,
    isHost,
    spaceId,

    // Overlay actions
    addOverlay,
    updateOverlay,
    removeOverlay,
    togglePin,
    bringForward,
    sendBackward,
    clearOverlays,
    sendDragging,

    // UI actions
    setEditMode,
    setGraffiti,
    setSelected,
  }), [
    elements,
    ghosts,
    ui.editMode,
    ui.graffitiMode,
    ui.selectedId,
    userId,
    isHost,
    spaceId,
    addOverlay, updateOverlay, removeOverlay,
    togglePin, bringForward, sendBackward, clearOverlays,
    sendDragging,
    setEditMode, setGraffiti, setSelected,
  ]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used inside <OverlayProvider>');
  return ctx;
}
