import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, User, Trash2, Shield, Plus, Edit2, MessageSquare } from 'lucide-react';
import { supabase } from "../../supabaseClient";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_ICONS = {
  channel_created: Plus,
  channel_deleted: Trash2,
  channel_updated: Edit2,
  role_assigned: Shield,
  member_joined: User,
  member_left: User,
  message_deleted: Trash2,
};

const ACTION_COLORS = {
  channel_created: 'text-green-400',
  channel_deleted: 'text-red-400',
  channel_updated: 'text-blue-400',
  role_assigned: 'text-purple-400',
  member_joined: 'text-green-400',
  member_left: 'text-yellow-400',
  message_deleted: 'text-red-400',
};

export default function AuditLogModal({ communityId, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen && communityId) {
      loadLogs();
    }
  }, [isOpen, communityId, filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('community_audit_logs')
        .select('*, user:user_id(*)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('[AuditLog] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      channel_created: 'Canal creado',
      channel_deleted: 'Canal eliminado',
      channel_updated: 'Canal actualizado',
      role_assigned: 'Rol asignado',
      member_joined: 'Miembro unido',
      member_left: 'Miembro salió',
      message_deleted: 'Mensaje eliminado',
    };
    return labels[action] || action;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-cyan-400" />
            Logs de Auditoría
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['all', 'channel_created', 'channel_deleted', 'member_joined', 'message_deleted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'Todos' : getActionLabel(f)}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay registros</p>
          ) : (
            logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] || MessageSquare;
              const colorClass = ACTION_COLORS[log.action] || 'text-gray-400';

              return (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${colorClass}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-400">
                        {log.user?.username || 'Sistema'}
                      </span>
                    </div>
                    {log.details?.name && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {log.details.name}
                        {log.details.type && ` (${log.details.type})`}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
