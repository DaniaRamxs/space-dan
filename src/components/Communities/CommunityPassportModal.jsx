import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Calendar, Star, Shield } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { channelsService } from '../../services/channelsService';
import { getUserReputation, calculateLevel } from '../../services/reputationService';

// Barra de progreso hacia el siguiente nivel
function RankProgressBar({ points }) {
  const level = calculateLevel(points);
  const isMax = level.name === 'Leyenda';
  const progressPct = isMax
    ? 100
    : Math.round(((points - level.min) / (level.max + 1 - level.min)) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>{level.min} pts</span>
        {!isMax && <span>{level.max + 1} pts</span>}
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%`, backgroundColor: level.color }}
        />
      </div>
    </div>
  );
}

export default function CommunityPassportModal({
  userId,
  communityId,
  isOpen,
  onClose,
  isOwnPassport = false,
}) {
  const [profile, setProfile]       = useState(null);
  const [reputation, setReputation] = useState(null);
  const [passport, setPassport]     = useState(null);
  const [loading, setLoading]       = useState(true);

  const [editingSig, setEditingSig] = useState(false);
  const [sigValue, setSigValue]     = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!isOpen || !userId || !communityId) return;
    setLoading(true);

    Promise.all([
      supabase.from('profiles').select('username, avatar_url, bio').eq('id', userId).single(),
      getUserReputation(userId, communityId),
      channelsService.getPassport(userId, communityId),
    ]).then(([{ data: prof }, rep, pass]) => {
      setProfile(prof);
      setReputation(rep);
      setPassport(pass);
      setSigValue(pass?.signature ?? '');
    }).finally(() => setLoading(false));
  }, [isOpen, userId, communityId]);

  const handleSaveSignature = async () => {
    setSaving(true);
    try {
      const updated = await channelsService.upsertPassport(userId, communityId, { signature: sigValue });
      setPassport(updated);
      setEditingSig(false);
    } catch (err) {
      console.error('[CommunityPassportModal] Save signature error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const points   = reputation?.points ?? 0;
  const level    = calculateLevel(points);
  const joinedAt = passport?.joined_at
    ? new Date(passport.joined_at).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const username = profile?.username ?? 'Piloto';
  const avatar   = profile?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const signature = passport?.signature ?? '';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner decorativo */}
        <div
          className="h-20 w-full"
          style={{
            background: `linear-gradient(135deg, ${level.color}33 0%, #1a1a24 100%)`,
          }}
        />

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Avatar */}
        <div className="px-5 pb-4">
          <div className="flex items-end gap-3 -mt-10 mb-3">
            <div className="relative">
              <img
                src={avatar}
                alt={username}
                className="w-16 h-16 rounded-xl object-cover border-4 border-[#1a1a24] shadow-lg"
              />
              <span
                className="absolute -bottom-1 -right-1 text-base leading-none"
                title={level.name}
              >
                {level.badge}
              </span>
            </div>
            <div className="pb-1 min-w-0">
              <p className="font-bold text-white truncate">{username}</p>
              <p className="text-xs font-semibold" style={{ color: level.color }}>
                {level.name}
              </p>
            </div>
          </div>

          {/* Puntos + barra */}
          {!loading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Star size={12} className="text-yellow-400" />
                  <span className="text-xs text-gray-300 font-medium">{points} puntos</span>
                </div>
                {level.name !== 'Leyenda' && (
                  <span className="text-[10px] text-gray-500">
                    {(level.max + 1) - points} para {
                      points < 50 ? 'Explorador' :
                      points < 150 ? 'Veterano' : 'Leyenda'
                    }
                  </span>
                )}
              </div>
              <RankProgressBar points={points} />
            </div>
          )}

          {/* Fecha de unión */}
          {joinedAt && (
            <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
              <Calendar size={11} />
              <span>Miembro desde {joinedAt}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/5 my-3" />

          {/* Firma */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <Shield size={10} />
                <span>Firma de comunidad</span>
              </div>
              {isOwnPassport && !editingSig && (
                <button
                  onClick={() => setEditingSig(true)}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>

            {editingSig ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sigValue}
                  onChange={(e) => setSigValue(e.target.value)}
                  maxLength={80}
                  placeholder="Tu frase en esta comunidad…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 min-w-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSignature();
                    if (e.key === 'Escape') { setEditingSig(false); setSigValue(passport?.signature ?? ''); }
                  }}
                />
                <button
                  onClick={handleSaveSignature}
                  disabled={saving}
                  className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <p className={`text-sm ${signature ? 'text-gray-300 italic' : 'text-gray-600 italic'}`}>
                {signature || (isOwnPassport ? 'Sin firma — pulsa el lápiz para añadir una' : 'Sin firma')}
              </p>
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-[#1a1a24]/80 flex items-center justify-center rounded-2xl">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
