/**
 * OverlayLayer — container that renders all overlay elements, ghost cursors,
 * and GraffitiCanvas.
 *
 * Element state and ghost cursors come from OverlayContext (via useOverlaySync).
 * No manual Colyseus message wiring here — that lives in useOverlaySync.
 * Pointer events are controlled by editMode.
 */

import { useOverlay } from '@/contexts/OverlayContext';
import OverlayItem from './OverlayItem';
import GraffitiCanvas from './GraffitiCanvas';

export default function OverlayLayer({ containerRef }) {
  const {
    elements,
    ghosts,
    editMode,
    setSelected,
  } = useOverlay();

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

      {/* Ghost cursors — other users currently dragging elements */}
      {Object.values(ghosts).map(ghost => (
        <GhostCursor key={ghost.userId} ghost={ghost} />
      ))}

      <GraffitiCanvas containerRef={containerRef} />
    </div>
  );
}

// ─── GhostCursor ──────────────────────────────────────────────────────────────

function GhostCursor({ ghost }) {
  return (
    <div
      style={{
        position:      'absolute',
        left:          ghost.x,
        top:           ghost.y,
        pointerEvents: 'none',
        zIndex:        200,
        transform:     'translate(-50%, -50%)',
        transition:    'left 0.1s linear, top 0.1s linear',
      }}
    >
      {/* Small avatar dot + name */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 ring-2 ring-white/20" />
        <span className="rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-cyan-300 leading-none whitespace-nowrap">
          {ghost.username}
        </span>
      </div>
    </div>
  );
}
