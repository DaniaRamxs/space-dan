/**
 * OverlayLayer — container that renders all overlay elements and GraffitiCanvas.
 *
 * Wires Colyseus room messages to context actions (remote path, no re-broadcast).
 * Pointer events are controlled by editMode: the layer itself is pointer-events:none
 * in view mode, but each OverlayItem always has pointer-events:auto so context menus
 * remain accessible in edit mode.
 */

import { useEffect } from 'react';
import { useOverlay } from '@/contexts/OverlayContext';
import OverlayItem from './OverlayItem';
import GraffitiCanvas from './GraffitiCanvas';

export default function OverlayLayer({ containerRef, colyseusRoom }) {
  const {
    elements,
    editMode,
    setSelected,
    addRemote,
    updateRemote,
    removeRemote,
    syncOverlays,
  } = useOverlay();

  // ── Wire Colyseus listeners ──────────────────────────────────────────────

  useEffect(() => {
    if (!colyseusRoom) return;

    const unsubs = [
      colyseusRoom.onMessage('OVERLAY_SYNC',   ({ elements: els }) => syncOverlays(els)),
      colyseusRoom.onMessage('OVERLAY_ADD',     (el)               => addRemote(el)),
      colyseusRoom.onMessage('OVERLAY_UPDATE',  ({ id, patch })    => updateRemote(id, patch)),
      colyseusRoom.onMessage('OVERLAY_REMOVE',  ({ id })           => removeRemote(id)),
    ];

    return () => unsubs.forEach(fn => typeof fn === 'function' && fn());
  }, [colyseusRoom, syncOverlays, addRemote, updateRemote, removeRemote]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        zIndex:        150,
        pointerEvents: editMode ? 'auto' : 'none',
      }}
      onClick={() => {
        if (editMode) setSelected(null);
      }}
    >
      {elements.map(el => (
        <OverlayItem
          key={el.id}
          element={el}
          containerRef={containerRef}
        />
      ))}

      <GraffitiCanvas containerRef={containerRef} />
    </div>
  );
}
