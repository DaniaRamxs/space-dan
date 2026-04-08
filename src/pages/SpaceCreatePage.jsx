/**
 * SpaceCreatePage — /spaces/new
 * Simple space creation page with animated star preview card.
 * Stars are pre-seeded (deterministic) to avoid re-render flicker.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Unlock } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

// ─── Pre-seeded stars (60 items, deterministic — no Math.random()) ─────────────

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x:   ((i * 37 + 13) % 97) + 1.5,
  y:   ((i * 53 + 7)  % 95) + 2.5,
  s:   ((i * 11) % 3) * 0.5 + 1,
  d:   (i * 1.4) % 5,
  dur: 1.8 + (i % 6) * 0.4,
}));

// ─── CSS keyframes injected via <style> ────────────────────────────────────────

const KEYFRAMES = `
  @keyframes twk {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50%       { opacity: 1;   transform: scale(1.2); }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateSpaceId(profile) {
  const slug   = (profile?.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

// ─── Star preview card ─────────────────────────────────────────────────────────

function StarPreviewCard({ name }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]"
         style={{ aspectRatio: '16/7' }}>
      {/* Stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left:     `${star.x}%`,
            top:      `${star.y}%`,
            width:    `${star.s}px`,
            height:   `${star.s}px`,
            opacity:  0.6,
            animationName: 'twk',
            animationDuration: `${star.dur}s`,
            animationDelay:    `${star.d}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        />
      ))}
      {/* Space name overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300/60">
          Vista previa
        </div>
        <p className="truncate text-center text-lg font-black text-white/80 tracking-wide max-w-[90%]">
          {name || 'Nuestro rincón…'}
        </p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SpaceCreatePage() {
  const navigate        = useNavigate();
  const { profile }     = useAuthContext();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (creating) return;
    setCreating(true);
    const spaceId = generateSpaceId(profile);
    const params  = new URLSearchParams({
      spaceName: name.trim() || 'Mi espacio',
      isPublic:  isPublic ? '1' : '0',
      new:       '1',
    });
    navigate(`/spaces/${spaceId}?${params.toString()}`);
  };

  return (
    <div className="min-h-full text-white">
      <style>{KEYFRAMES}</style>

      <div className="mx-auto max-w-md px-4 pb-20 pt-10 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 mb-4">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              Nuevo espacio
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.1em]">
            Crea tu espacio
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Un lugar solo para ti y quien elijas.
          </p>
        </motion.div>

        {/* Card form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex flex-col gap-6 rounded-[28px] border border-white/8 bg-white/[0.03] p-6"
        >
          {/* Preview card */}
          <StarPreviewCard name={name} />

          {/* Name input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              Nombre del espacio
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nuestro rincón…"
              maxLength={40}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40 focus:bg-white/[0.07] transition"
            />
            <div className="text-right text-[10px] text-white/25">
              {name.length}/40
            </div>
          </div>

          {/* Public / Private toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              Visibilidad
            </label>
            <button
              onClick={() => setIsPublic(v => !v)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                isPublic
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 bg-white/[0.04] text-white/60'
              }`}
            >
              {isPublic
                ? <Unlock size={16} className="shrink-0" />
                : <Lock    size={16} className="shrink-0" />}
              <span>{isPublic ? 'Público — aparece en el hub' : 'Privado — solo por enlace'}</span>
            </button>
          </div>

          {/* Create button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-60"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creando…
              </span>
            ) : (
              '✨ Crear espacio'
            )}
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
