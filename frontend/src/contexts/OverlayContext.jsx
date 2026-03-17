/**
 * OverlayContext — Room Overlay Engine
 *
 * Manages a collection of overlay elements (gifs, stickers, drawings, text)
 * layered on top of the space session. Local mutations sync to Colyseus;
 * remote actions come from Colyseus broadcasts and skip re-sending.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useRef,
} from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_OVERLAYS = 50;
const POSITION_THROTTLE_MS = 50;

// ─── Initial state ────────────────────────────────────────────────────────────

/** @type {{ elements: OverlayElement[], editMode: boolean, graffitiMode: boolean, selectedId: string|null }} */
const INITIAL_STATE = {
  elements:     [],
  editMode:     false,
  graffitiMode: false,
  selectedId:   null,
};

// ─── Action types ─────────────────────────────────────────────────────────────

const A = {
  ADD:           'ADD',
  UPDATE:        'UPDATE',
  REMOVE:        'REMOVE',
  TOGGLE_PIN:    'TOGGLE_PIN',
  BRING_FORWARD: 'BRING_FORWARD',
  SEND_BACKWARD: 'SEND_BACKWARD',
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  SET_GRAFFITI:  'SET_GRAFFITI',
  SET_SELECTED:  'SET_SELECTED',
  SYNC:          'SYNC',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maxZ(elements) {
  return elements.reduce((m, el) => Math.max(m, el.zIndex ?? 0), 0);
}

function clampElements(elements) {
  return elements.slice(-MAX_OVERLAYS);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function overlayReducer(state, action) {
  switch (action.type) {

    case A.ADD: {
      if (state.elements.length >= MAX_OVERLAYS) return state;
      const el = {
        id:           action.payload.id ?? crypto.randomUUID(),
        type:         'sticker',
        src:          '',
        text:         '',
        position:     { x: 80, y: 80 },
        scale:        1,
        rotation:     0,
        zIndex:       maxZ(state.elements) + 1,
        isPersistent: false,
        createdBy:    '',
        createdAt:    Date.now(),
        width:        null,
        height:       null,
        ...action.payload,
      };
      return { ...state, elements: clampElements([...state.elements, el]) };
    }

    case A.UPDATE: {
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, ...action.patch } : el
        ),
      };
    }

    case A.REMOVE: {
      return {
        ...state,
        elements:   state.elements.filter(el => el.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    }

    case A.TOGGLE_PIN: {
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, isPersistent: !el.isPersistent } : el
        ),
      };
    }

    case A.BRING_FORWARD: {
      const topZ = maxZ(state.elements);
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, zIndex: topZ + 1 } : el
        ),
      };
    }

    case A.SEND_BACKWARD: {
      const minZ = state.elements.reduce((m, el) => Math.min(m, el.zIndex ?? 0), 0);
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, zIndex: Math.max(0, minZ - 1) } : el
        ),
      };
    }

    case A.SET_EDIT_MODE: {
      return { ...state, editMode: action.value };
    }

    case A.SET_GRAFFITI: {
      return { ...state, graffitiMode: action.value };
    }

    case A.SET_SELECTED: {
      return { ...state, selectedId: action.id };
    }

    case A.SYNC: {
      return { ...state, elements: clampElements(action.elements ?? []) };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OverlayContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * @param {{ children: React.ReactNode, spaceId: string, colyseusRoom: any, userId: string, isHost: boolean }} props
 */
export function OverlayProvider({ children, spaceId, colyseusRoom, userId, isHost }) {
  const [state, dispatch] = useReducer(overlayReducer, INITIAL_STATE);

  // Throttle ref for position updates to avoid flooding the server
  const positionThrottleRef = useRef({});

  // ── Colyseus sync helper ─────────────────────────────────────────────────

  const sendToRoom = useCallback((msgType, payload) => {
    if (!colyseusRoom) return;
    try {
      colyseusRoom.send(msgType, payload);
    } catch (err) {
      console.warn('[OverlayContext] send failed:', err);
    }
  }, [colyseusRoom]);

  const throttledSendPosition = useCallback((id, position) => {
    const now = Date.now();
    const last = positionThrottleRef.current[id] ?? 0;
    if (now - last < POSITION_THROTTLE_MS) return;
    positionThrottleRef.current[id] = now;
    sendToRoom('OVERLAY_UPDATE', { id, patch: { position } });
  }, [sendToRoom]);

  // ── Remote actions (from Colyseus — no re-send) ──────────────────────────

  const addRemote = useCallback((payload) => {
    dispatch({ type: A.ADD, payload });
  }, []);

  const updateRemote = useCallback((id, patch) => {
    dispatch({ type: A.UPDATE, id, patch });
  }, []);

  const removeRemote = useCallback((id) => {
    dispatch({ type: A.REMOVE, id });
  }, []);

  // ── Local actions (optimistic + sync to server) ──────────────────────────

  /**
   * Add overlay element.
   * @param {'gif'|'sticker'|'drawing'|'text'} type
   * @param {Partial<OverlayElement>} extra
   */
  const addOverlay = useCallback((type, extra = {}) => {
    // Generate id here so the same id goes to both local state and server
    const id = crypto.randomUUID();
    const payload = {
      id,
      type,
      createdBy: userId,
      createdAt: Date.now(),
      ...extra,
    };
    dispatch({ type: A.ADD, payload });
    sendToRoom('OVERLAY_ADD', payload);
  }, [userId, sendToRoom]);

  const updateOverlay = useCallback((id, patch) => {
    dispatch({ type: A.UPDATE, id, patch });
    if (patch.position) {
      throttledSendPosition(id, patch.position);
    } else {
      sendToRoom('OVERLAY_UPDATE', { id, patch });
    }
  }, [sendToRoom, throttledSendPosition]);

  const removeOverlay = useCallback((id) => {
    dispatch({ type: A.REMOVE, id });
    sendToRoom('OVERLAY_REMOVE', { id });
  }, [sendToRoom]);

  const togglePin = useCallback((id) => {
    dispatch({ type: A.TOGGLE_PIN, id });
    sendToRoom('OVERLAY_TOGGLE_PIN', { id });
  }, [sendToRoom]);

  const bringForward = useCallback((id) => {
    dispatch({ type: A.BRING_FORWARD, id });
    sendToRoom('OVERLAY_BRING_FORWARD', { id });
  }, [sendToRoom]);

  const sendBackward = useCallback((id) => {
    dispatch({ type: A.SEND_BACKWARD, id });
    sendToRoom('OVERLAY_SEND_BACKWARD', { id });
  }, [sendToRoom]);

  // ── UI state actions ─────────────────────────────────────────────────────

  const setEditMode = useCallback((value) => {
    dispatch({ type: A.SET_EDIT_MODE, value });
  }, []);

  const setGraffiti = useCallback((value) => {
    dispatch({ type: A.SET_GRAFFITI, value });
  }, []);

  const setSelected = useCallback((id) => {
    dispatch({ type: A.SET_SELECTED, id });
  }, []);

  const syncOverlays = useCallback((elements) => {
    dispatch({ type: A.SYNC, elements });
  }, []);

  // ── Memoized context value ───────────────────────────────────────────────

  const value = useMemo(() => ({
    // State
    elements:     state.elements,
    editMode:     state.editMode,
    graffitiMode: state.graffitiMode,
    selectedId:   state.selectedId,

    // Identity props (for child components)
    userId,
    isHost,
    spaceId,

    // Remote actions (no server sync)
    addRemote,
    updateRemote,
    removeRemote,

    // Local actions (sync to server)
    addOverlay,
    updateOverlay,
    removeOverlay,
    togglePin,
    bringForward,
    sendBackward,

    // UI actions
    setEditMode,
    setGraffiti,
    setSelected,
    syncOverlays,
  }), [
    state.elements,
    state.editMode,
    state.graffitiMode,
    state.selectedId,
    userId,
    isHost,
    spaceId,
    addRemote, updateRemote, removeRemote,
    addOverlay, updateOverlay, removeOverlay,
    togglePin, bringForward, sendBackward,
    setEditMode, setGraffiti, setSelected, syncOverlays,
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
