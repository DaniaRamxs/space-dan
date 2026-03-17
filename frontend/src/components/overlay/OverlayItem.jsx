/**
 * OverlayItem — individual draggable overlay element.
 *
 * Rendered inside OverlayLayer for each element in the overlay collection.
 * Uses Framer Motion's useMotionValue for smooth drag (no React re-renders
 * during drag). Supports context menu with pin/layer/delete actions.
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useOverlay } from '@/contexts/OverlayContext';

// ─── ContextMenu ──────────────────────────────────────────────────────────────

function ContextMenu({ x, y, element, onClose }) {
  const {
    togglePin,
    bringForward,
    sendBackward,
    removeOverlay,
    userId,
    isHost,
  } = useOverlay();

  const canDelete = element.createdBy === userId || isHost;

  const handleAction = useCallback((fn) => {
    fn();
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Invisible backdrop to dismiss on outside click */}
      <div
        className="fixed inset-0 z-[99998]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      {/* Menu */}
      <div
        className="fixed z-[99999] min-w-[160px] rounded-2xl border border-white/10 bg-[#0a0a1a]/95 p-1.5 shadow-2xl backdrop-blur-xl"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        <ContextMenuItem
          label={element.isPersistent ? '📌 Desanclar' : '📌 Anclar'}
          onClick={() => handleAction(() => togglePin(element.id))}
        />
        <ContextMenuItem
          label="⬆ Traer adelante"
          onClick={() => handleAction(() => bringForward(element.id))}
        />
        <ContextMenuItem
          label="⬇ Enviar atrás"
          onClick={() => handleAction(() => sendBackward(element.id))}
        />
        {canDelete && (
          <>
            <div className="my-1 h-px bg-white/10" />
            <ContextMenuItem
              label="🗑 Eliminar"
              danger
              onClick={() => handleAction(() => removeOverlay(element.id))}
            />
          </>
        )}
      </div>
    </>
  );
}

function ContextMenuItem({ label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-white/[0.07] ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/80'
      }`}
    >
      {label}
    </button>
  );
}

// ─── OverlayItem ─────────────────────────────────────────────────────────────

function OverlayItem({ element, containerRef }) {
  const {
    editMode,
    selectedId,
    updateOverlay,
    removeOverlay,
    setSelected,
    userId,
    isHost,
  } = useOverlay();

  // Framer Motion values for smooth drag (no re-renders during drag)
  const motionX = useMotionValue(element.position?.x ?? 0);
  const motionY = useMotionValue(element.position?.y ?? 0);

  // Sync external position updates (from remote) into motion values
  useEffect(() => {
    motionX.set(element.position?.x ?? 0);
    motionY.set(element.position?.y ?? 0);
  }, [element.position?.x, element.position?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y }

  const isSelected = selectedId === element.id;
  const canDelete  = element.createdBy === userId || isHost;

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setSelected(element.id);
  }, [element.id, setSelected]);

  const handleDragEnd = useCallback(() => {
    updateOverlay(element.id, {
      position: { x: motionX.get(), y: motionY.get() },
    });
  }, [element.id, updateOverlay, motionX, motionY]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (editMode) {
      setSelected(element.id);
    }
  }, [editMode, element.id, setSelected]);

  // Animate selection outline
  const outlineAnimation = isSelected && editMode
    ? { boxShadow: '0 0 0 2px rgba(34,211,238,0.7)' }
    : { boxShadow: '0 0 0 0px rgba(34,211,238,0)' };

  return (
    <>
      <motion.div
        drag={editMode}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={containerRef}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          x:            motionX,
          y:            motionY,
          position:     'absolute',
          top:          0,
          left:         0,
          zIndex:       element.zIndex ?? 1,
          scale:        element.scale ?? 1,
          rotate:       element.rotation ?? 0,
          cursor:       editMode ? 'grab' : 'default',
          pointerEvents: 'auto',
          userSelect:   'none',
          ...outlineAnimation,
          borderRadius: isSelected && editMode ? '12px' : '0px',
          transition:   'box-shadow 0.15s ease',
        }}
        whileHover={editMode ? { scale: (element.scale ?? 1) * 1.06 } : {}}
        animate={outlineAnimation}
      >
        {/* Pin indicator */}
        {element.isPersistent && (
          <span
            className="absolute -top-3 -left-1 text-xs leading-none"
            style={{ zIndex: 1, pointerEvents: 'none' }}
          >
            📌
          </span>
        )}

        {/* Delete button */}
        {isSelected && editMode && canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeOverlay(element.id);
            }}
            className="absolute -top-3 -right-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white shadow-lg hover:bg-red-400 transition"
            title="Eliminar"
          >
            ✕
          </button>
        )}

        {/* Content by type */}
        <ElementContent element={element} />
      </motion.div>

      {/* Context menu (rendered at fixed position) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          element={element}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

// ─── ElementContent ───────────────────────────────────────────────────────────

function ElementContent({ element }) {
  switch (element.type) {
    case 'gif':
    case 'sticker':
      return (
        <img
          src={element.src}
          alt=""
          draggable={false}
          className="max-w-[160px] max-h-[160px] rounded-lg object-contain"
          style={{ pointerEvents: 'none', display: 'block' }}
        />
      );

    case 'text':
      return (
        <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm font-bold text-white backdrop-blur">
          {element.text}
        </div>
      );

    case 'drawing':
      return (
        <img
          src={element.src}
          alt=""
          draggable={false}
          style={{
            width:         element.width  ?? 'auto',
            height:        element.height ?? 'auto',
            pointerEvents: 'none',
            display:       'block',
          }}
        />
      );

    default:
      return null;
  }
}

export { OverlayItem };
export default memo(OverlayItem);
