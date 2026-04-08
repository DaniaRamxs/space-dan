// useGraffiti — thin hook for graffiti integration with the MangaParty room.
//
// Manages:
//   • canvasRef   — forwarded ref to GraffitiCanvas (call undo / clear / getStrokes)
//   • handleDrawEvent — bridges canvas onEvent → room broadcast
//   • undo / clear    — imperative shortcuts
//
// Usage:
//   const graffiti = useGraffiti({ broadcast });
//   <GraffitiCanvas ref={graffiti.canvasRef} onEvent={graffiti.handleDrawEvent} ... />
//   <button onClick={graffiti.undo} />

import { useRef, useCallback } from 'react';

export function useGraffiti({ broadcast }) {
  const canvasRef = useRef(null);

  // Bridges canvas onEvent → room broadcast (manga_sync)
  const handleDrawEvent = useCallback((ev) => {
    broadcast('manga_sync', ev);
  }, [broadcast]);

  const undo = useCallback(() => {
    canvasRef.current?.undo?.();
  }, []);

  const clear = useCallback(() => {
    canvasRef.current?.clear?.();
  }, []);

  // Returns current strokesByPage snapshot (use in state_snapshot for late joiners)
  const getStrokesSnapshot = useCallback(() => {
    return canvasRef.current?.getStrokes?.() ?? {};
  }, []);

  return { canvasRef, handleDrawEvent, undo, clear, getStrokesSnapshot };
}
