import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Link2, Clock, Users, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from "../../supabaseClient";
import toast from 'react-hot-toast';

export default function InviteModal({ communityId, isOpen, onClose }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');

  useEffect(() => {
    if (isOpen && communityId) {
      loadInvites();
    }
  }, [isOpen, communityId]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_invites')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error('[InviteModal] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      setCreating(true);
      const { data, error } = await supabase
        .rpc('create_community_invite', {
          p_community_id: communityId,
          p_max_uses: maxUses ? parseInt(maxUses) : null,
          p_expires_hours: expiresIn ? parseInt(expiresIn) : null
        });

      if (error) throw error;
      
      toast.success('Invitación creada');
      setMaxUses('');
      await loadInvites();
    } catch (err) {
      console.error('[InviteModal] Create error:', err);
      toast.error('Error al crear invitación');
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (code) => {
    try {
      const { error } = await supabase
        .from('community_invites')
        .update({ is_active: false })
        .eq('code', code);

      if (error) throw error;
      
      toast.success('Invitación eliminada');
      await loadInvites();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const copyInvite = (code) => {
    const url = `${window.location.origin}/community/join/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'Nunca expira';
    const diff = new Date(expiresAt) - new Date();
    if (diff < 0) return 'Expirada';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Expira en < 1h';
    return `Expira en ${hours}h`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Link2 size={20} className="text-cyan-400" />
            Invitaciones
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Create New Invite */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Nueva invitación</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Usos máximos</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="∞"
                min="1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Expira en (horas)</label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Nunca</option>
                <option value="1">1 hora</option>
                <option value="6">6 horas</option>
                <option value="24">24 horas</option>
                <option value="168">7 días</option>
              </select>
            </div>
          </div>
          <button
            onClick={createInvite}
            disabled={creating}
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-lg text-cyan-950 font-semibold text-sm transition-colors"
          >
            {creating ? 'Creando...' : 'Crear invitación'}
          </button>
        </div>

        {/* Active Invites List */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Invitaciones activas ({invites.length})
          </h4>
          
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No hay invitaciones activas
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {invites.map((invite) => (
                <div key={invite.code} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-cyan-400 text-sm font-mono">{invite.code}</code>
                      {invite.max_uses && (
                        <span className="text-xs text-gray-500">
                          {invite.uses}/{invite.max_uses} usos
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {invite.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatExpiry(invite.expires_at)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {invite.uses} usos
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => copyInvite(invite.code)}
                    className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Copiar link"
                  >
                    <Copy size={16} />
                  </button>
                  
                  <button
                    onClick={() => deleteInvite(invite.code)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
