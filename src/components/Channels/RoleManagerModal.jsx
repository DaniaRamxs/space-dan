import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Shield, Check, Users } from 'lucide-react';
import { supabase } from "../../supabaseClient";
import toast from 'react-hot-toast';

const PERMISSIONS = [
  { id: 'send_messages', label: 'Enviar mensajes', icon: '💬' },
  { id: 'connect_voice', label: 'Conectar a voz', icon: '🎙️' },
  { id: 'create_posts', label: 'Crear posts', icon: '📝' },
  { id: 'manage_channels', label: 'Gestionar canales', icon: '⚙️' },
  { id: 'manage_roles', label: 'Gestionar roles', icon: '🛡️' },
  { id: 'kick_members', label: 'Expulsar miembros', icon: '👢' },
  { id: 'ban_members', label: 'Banear miembros', icon: '🚫' },
];

const COLORS = [
  '#5865F2', '#EB459E', '#57F287', '#FEE75C', '#ED4245', '#5865F2', '#EB459E'
];

export default function RoleManagerModal({ communityId, isOpen, onClose }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    if (isOpen && communityId) {
      loadRoles();
    }
  }, [isOpen, communityId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_roles')
        .select('*')
        .eq('community_id', communityId)
        .order('position', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('[RoleManager] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('community_roles')
        .insert({
          community_id: communityId,
          name: newRoleName.trim(),
          color: selectedColor,
          position: roles.length,
          permissions: Object.fromEntries(selectedPermissions.map(p => [p, true])),
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Rol creado');
      setNewRoleName('');
      setSelectedPermissions([]);
      await loadRoles();
    } catch (err) {
      toast.error('Error al crear rol');
    }
  };

  const updateRole = async (roleId, updates) => {
    try {
      const { error } = await supabase
        .from('community_roles')
        .update(updates)
        .eq('id', roleId);

      if (error) throw error;
      toast.success('Rol actualizado');
      await loadRoles();
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const deleteRole = async (roleId) => {
    if (!confirm('¿Eliminar este rol?')) return;
    
    try {
      const { error } = await supabase
        .from('community_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      toast.success('Rol eliminado');
      await loadRoles();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const togglePermission = (permId) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={20} className="text-cyan-400" />
            Gestionar Roles
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Create New Role */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Nuevo Rol</h4>
          
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Nombre del rol"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={createRole}
              disabled={!newRoleName.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-lg text-cyan-950 font-semibold text-sm"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex gap-2 mb-3">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === color ? 'ring-2 ring-white scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Permissions */}
          <div className="grid grid-cols-2 gap-2">
            {PERMISSIONS.map((perm) => (
              <button
                key={perm.id}
                onClick={() => togglePermission(perm.id)}
                className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                  selectedPermissions.includes(perm.id)
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span>{perm.icon}</span>
                <span className="flex-1">{perm.label}</span>
                {selectedPermissions.includes(perm.id) && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Roles List */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Roles ({roles.length})
          </h4>
          
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">{role.name}</span>
                    <div className="text-xs text-gray-500">
                      {Object.keys(role.permissions || {}).length} permisos
                    </div>
                  </div>
                  
                  {role.name !== 'Owner' && role.name !== 'Member' && (
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
