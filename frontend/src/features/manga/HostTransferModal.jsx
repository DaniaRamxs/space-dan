import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, AlertTriangle } from 'lucide-react';

// ─── HostTransferModal ────────────────────────────────────────────────────────
// Confirmation dialog before transferring host to another participant.
//
// Props:
//   isOpen        — controls visibility
//   targetUsername — the participant receiving host
//   onConfirm     — () => void  — proceed with transfer
//   onCancel      — () => void  — close without action

const HostTransferModal = memo(({ isOpen, targetUsername, onConfirm, onCancel }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10050]"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 12 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10051]
                     w-80 bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl p-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30
                              flex items-center justify-center">
                <Crown size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-black text-sm">Transferir host</p>
                <p className="text-white/40 text-xs">Esta acción es inmediata</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/30 hover:text-white transition-colors p-1"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-4">
            <p className="text-white/70 text-sm leading-relaxed">
              ¿Transferir el control de la sala a{' '}
              <span className="text-violet-400 font-black">@{targetUsername}</span>?
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-amber-400/70">
              <AlertTriangle size={11} />
              <span className="text-[10px]">Perderás los controles de host</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10
                         text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400
                         text-black text-sm font-black transition-all active:scale-95"
            >
              <Crown size={13} className="inline mr-1.5" />
              Transferir
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
));

HostTransferModal.displayName = 'HostTransferModal';
export default HostTransferModal;
