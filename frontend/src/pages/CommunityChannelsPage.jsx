/**
 * CommunityChannelsPage - Discord-like Channel System
 * Página principal de comunidad con sistema de canales
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, ChevronLeft, Users, Hash, Volume2, MessageSquare,
  MoreVertical, Settings, Plus, Shield, Link2, Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { communitiesService } from '../services/communitiesService';
import { channelsService } from '../services/channelsService';
import ChannelSidebar from '../components/Channels/ChannelSidebar';
import TextChannel from '../components/Channels/TextChannel';
import VoiceChannel from '../components/Channels/VoiceChannel';
import ForumChannel from '../components/Channels/ForumChannel';
import RankingPanel from '../components/RankingPanel';
import InviteModal from '../components/Channels/InviteModal';
import RoleManagerModal from '../components/Channels/RoleManagerModal';
import AuditLogModal from '../components/Channels/AuditLogModal';
import toast from 'react-hot-toast';

export default function CommunityChannelsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [community, setCommunity] = useState(null);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  // Load community and channels
  const loadCommunityData = useCallback(async () => {
    if (!slug) return;
    
    try {
      setLoading(true);
      
      // Get community by slug
      const communityData = await communitiesService.getCommunityBySlug(slug);
      setCommunity(communityData);
      
      if (user && communityData.id) {
        // Check membership
        const membership = await communitiesService.checkMembership(communityData.id);
        setIsMember(membership);
        
        // Check if owner (using creator_id from community data or API check)
        const isOwnerCheck = communityData.creator_id === user.id || 
                             (await channelsService.isCommunityOwner(communityData.id, user.id));
        setIsOwner(isOwnerCheck);
      }
      
      // Load channels
      const channelsData = await channelsService.getCommunityChannels(communityData.id);
      setChannels(channelsData);
      
      // Check if community needs setup (no channels = old community)
      if (channelsData.length === 0 && communityData.creator_id === user?.id) {
        setNeedsSetup(true);
      } else {
        setNeedsSetup(false);
        // Set default channel (first text channel)
        const defaultChannel = channelsData.find(c => c.type === 'text') || channelsData[0];
        if (defaultChannel && !currentChannel) {
          setCurrentChannel(defaultChannel);
        }
      }
    } catch (err) {
      console.error('[CommunityChannelsPage] Load error:', err);
      toast.error('Error al cargar la comunidad');
    } finally {
      setLoading(false);
    }
  }, [slug, user, currentChannel?.id]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Real-time channel updates
  useEffect(() => {
    if (!community?.id) return;
    
    const subscription = supabase
      .channel(`community-channels-${community.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_channels',
        filter: `community_id=eq.${community.id}`
      }, () => {
        loadCommunityData();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [community?.id, loadCommunityData]);

  const handleJoinCommunity = async () => {
    if (!user || !community) return;
    try {
      await communitiesService.joinCommunity(community.id);
      setIsMember(true);
      toast.success('¡Te uniste a la comunidad!');
    } catch (err) {
      toast.error('Error al unirse');
    }
  };

  const handleLeaveCommunity = async () => {
    if (!user || !community) return;
    if (!confirm('¿Salir de esta comunidad?')) return;
    
    try {
      await communitiesService.leaveCommunity(community.id);
      setIsMember(false);
      toast.success('Saliste de la comunidad');
    } catch (err) {
      toast.error('Error al salir');
    }
  };

  const handleSetupCommunity = async () => {
    if (!user || !community || !isOwner) return;
    
    try {
      setSettingUp(true);
      const result = await channelsService.setupCommunity(community.id);
      
      if (result.success) {
        toast.success('Comunidad configurada exitosamente');
        setNeedsSetup(false);
        // Reload to get new channels
        await loadCommunityData();
      } else {
        toast.error(result.error || 'Error al configurar comunidad');
      }
    } catch (err) {
      console.error('[CommunityChannelsPage] Setup error:', err);
      toast.error('Error al configurar comunidad');
    } finally {
      setSettingUp(false);
    }
  };

  // Render channel content based on type
  const renderChannelContent = () => {
    if (!currentChannel) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0f0f13]">
          <div className="text-center">
            <Hash size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Selecciona un canal para empezar</p>
          </div>
        </div>
      );
    }

    const props = {
      channel: currentChannel,
      communityId: community?.id,
      communityName: community?.name,
      isMember,
      isOwner,
    };

    switch (currentChannel.type) {
      case 'text':
        return <TextChannel {...props} />;
      case 'voice':
        return <VoiceChannel {...props} />;
      case 'forum':
        return <ForumChannel {...props} />;
      default:
        return <TextChannel {...props} />;
    }
  };

  if (loading) {
    return <CommunitySkeleton />;
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Comunidad no encontrada</p>
          <button 
            onClick={() => navigate('/communities')}
            className="mt-4 px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Show setup screen for old communities without channels
  if (needsSetup && isOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a24] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} className="text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configurar Comunidad</h2>
          <p className="text-gray-400 mb-6">
            Esta comunidad fue creada antes del sistema de canales. 
            Haz clic para configurarla con canales por defecto.
          </p>
          <button
            onClick={handleSetupCommunity}
            disabled={settingUp}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-xl text-cyan-950 font-semibold transition-all flex items-center justify-center gap-2"
          >
            {settingUp ? (
              <>
                <div className="w-5 h-5 border-2 border-cyan-950/30 border-t-cyan-950 rounded-full animate-spin" />
                Configurando...
              </>
            ) : (
              <>
                <Plus size={20} />
                Configurar ahora
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (needsSetup && !isOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a24] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Comunidad en mantenimiento</h2>
          <p className="text-gray-400">
            Esta comunidad está siendo actualizada por su owner. 
            Por favor, vuelve más tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0f] text-white flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar - Channels */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1a1a24] border-r border-white/5 transform transition-transform lg:transform-none ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Community Header */}
        <div className="h-auto min-h-14 flex flex-col px-4 py-2 border-b border-white/5 bg-[#1a1a24]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCommunityMenu(!showCommunityMenu)}
              className="flex items-center gap-2 text-white font-semibold hover:bg-white/5 rounded-lg px-2 py-1 -ml-2 transition-colors"
            >
              <span className="truncate">{community.name}</span>
              <ChevronLeft 
                size={16} 
                className={`transition-transform ${showCommunityMenu ? '-rotate-90' : ''}`}
              />
            </button>
            
            {/* Owner Settings Button */}
            {isOwner && (
              <button
                onClick={() => setShowOwnerMenu(!showOwnerMenu)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
          
          {/* Owner info */}
          {community.creator?.username && (
            <span className="text-xs text-gray-500 ml-0.5">
              owner: @{community.creator.username}
            </span>
          )}
          
          {/* Owner Menu Dropdown */}
          <AnimatePresence>
            {showOwnerMenu && isOwner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 right-4 w-56 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      setShowOwnerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-300 hover:bg-white/5 hover:text-cyan-400 rounded-lg transition-colors"
                  >
                    <Link2 size={16} />
                    <span className="text-sm">Invitaciones</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRoleModal(true);
                      setShowOwnerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-300 hover:bg-white/5 hover:text-purple-400 rounded-lg transition-colors"
                  >
                    <Shield size={16} />
                    <span className="text-sm">Gestionar Roles</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAuditModal(true);
                      setShowOwnerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-300 hover:bg-white/5 hover:text-yellow-400 rounded-lg transition-colors"
                  >
                    <Clock size={16} />
                    <span className="text-sm">Logs de Auditoría</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Community Menu Dropdown */}
          <AnimatePresence>
            {showCommunityMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-4 right-4 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {isMember ? (
                  <button
                    onClick={() => {
                      handleLeaveCommunity();
                      setShowCommunityMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Salir de la comunidad
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleJoinCommunity();
                      setShowCommunityMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  >
                    Unirse a la comunidad
                  </button>
                )}
                <div className="border-t border-white/5" />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copiado');
                    setShowCommunityMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-gray-400 hover:bg-white/5 transition-colors"
                >
                  Copiar invitación
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto h-[calc(100%-4.5rem)]">
          <ChannelSidebar
            communityId={community.id}
            channels={channels}
            currentChannel={currentChannel}
            onChannelSelect={(channel) => {
              setCurrentChannel(channel);
              setMobileSidebarOpen(false);
            }}
            isOwner={isOwner}
            user={user}
            isMobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            {currentChannel?.type === 'text' && <Hash size={18} className="text-gray-500" />}
            {currentChannel?.type === 'voice' && <Volume2 size={18} className="text-emerald-400" />}
            {currentChannel?.type === 'forum' && <MessageSquare size={18} className="text-amber-400" />}
            <span className="font-semibold text-white">{currentChannel?.name}</span>
          </div>
          
          <div className="w-8" /> {/* Spacer for alignment */}
        </header>

        {/* Channel Content */}
        <div className="flex-1 flex overflow-hidden">
          {renderChannelContent()}
          
          {/* Right Panel - Activity/Ranking (Desktop only) */}
          <aside className="hidden xl:block w-72 border-l border-white/5 bg-[#0f0f13] p-4">
            <RankingPanel communityId={community.id} compact />
          </aside>
        </div>
      </main>

      {/* Modals */}
      <InviteModal
        communityId={community?.id}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
      
      <RoleManagerModal
        communityId={community?.id}
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
      />
      
      <AuditLogModal
        communityId={community?.id}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="h-screen w-full bg-[#0a0a0f] flex">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-[#1a1a24] border-r border-white/5 p-4 space-y-4">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-8 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-8 w-full bg-white/5 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-8 w-full bg-white/5 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-white/5 bg-[#0f0f13]" />
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-16 w-full bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
