/**
 * CommunityChannelsPage - Discord-like Channel System
 * Página principal de comunidad con sistema de canales
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, ChevronLeft, Hash, Volume2, MessageSquare,
  Settings, Plus, Shield, Link2, Clock, Trophy, X, Users
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
import CommunityMemberList from '../components/Communities/CommunityMemberList';
import InviteModal from '../components/Channels/InviteModal';
import RoleManagerModal from '../components/Channels/RoleManagerModal';
import AuditLogModal from '../components/Channels/AuditLogModal';
import toast from 'react-hot-toast';

export default function CommunityChannelsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();

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

  // Canal de voz activo — se mantiene montado aunque el usuario navegue a otro canal
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);

  // callback para cuando el canal de voz establece conexión
  const handleJoinVoice = (_roomName, _channelName) => {};

  // Ranking panel en mobile
  const [showMobileRanking, setShowMobileRanking] = useState(false);
  // Panel de miembros
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [rightPanel, setRightPanel] = useState('ranking'); // 'ranking' | 'members'

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
    const voiceChannels = channels.filter(c => c.type === 'voice');

    const isViewingVoice = currentChannel?.type === 'voice';
    const showEmpty = !currentChannel;

    return (
      <>
        {/* Canales de voz — siempre montados para no cortar la conexión */}
        {voiceChannels.map(vc => (
          <div
            key={vc.id}
            className="flex-1 flex flex-col min-w-0 min-h-0"
            style={{ display: isViewingVoice && currentChannel?.id === vc.id ? 'flex' : 'none' }}
          >
            <VoiceChannel
              channel={vc}
              communityId={community?.id}
              communityName={community?.name}
              isMember={isMember}
              isOwner={isOwner}
              onJoinVoice={handleJoinVoice}
              onVoiceConnected={() => setActiveVoiceChannel(vc.id)}
              onVoiceDisconnected={() => setActiveVoiceChannel(null)}
              userId={user?.id}
              userAvatar={profile?.avatar_url}
              userName={profile?.username}
              nicknameStyle={profile?.equipped_nickname_style}
              frameId={profile?.frame_item_id}
              activityLevel={profile?.activity_level}
            />
          </div>
        ))}

        {/* Canal de texto / foro / vacío */}
        {!isViewingVoice && (
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {showEmpty ? (
              <div className="flex-1 flex items-center justify-center bg-[#0f0f13]">
                <div className="text-center">
                  <Hash size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">Selecciona un canal para empezar</p>
                </div>
              </div>
            ) : currentChannel.type === 'forum' ? (
              <ForumChannel
                channel={currentChannel}
                communityId={community?.id}
                communityName={community?.name}
                isMember={isMember}
                isOwner={isOwner}
              />
            ) : (
              <TextChannel
                channel={currentChannel}
                communityId={community?.id}
                communityName={community?.name}
                isMember={isMember}
                isOwner={isOwner}
              />
            )}
          </div>
        )}
      </>
    );
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
            activeVoiceChannelId={activeVoiceChannel}
          />
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {currentChannel?.type === 'text' && <Hash size={16} className="text-gray-500 shrink-0" />}
            {currentChannel?.type === 'voice' && <Volume2 size={16} className="text-emerald-400 shrink-0" />}
            {currentChannel?.type === 'forum' && <MessageSquare size={16} className="text-amber-400 shrink-0" />}
            <span className="font-semibold text-white text-sm truncate max-w-[140px]">
              {currentChannel?.name || community.name}
            </span>
          </div>

          {/* Botones mobile: ranking + miembros */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMobileMembers(true)}
              className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
              aria-label="Ver miembros"
            >
              <Users size={20} />
            </button>
            <button
              onClick={() => setShowMobileRanking(true)}
              className="p-2 -mr-1 text-gray-400 hover:text-orange-400 transition-colors"
              aria-label="Ver ranking"
            >
              <Trophy size={20} />
            </button>
          </div>
        </header>

        {/* Channel Content */}
        <div className="flex-1 flex overflow-hidden">
          {renderChannelContent()}
          
          {/* Right Panel — Desktop lg+ */}
          <aside className="hidden lg:flex w-64 xl:w-72 border-l border-white/5 bg-[#0f0f13] flex-col">
            {/* Tabs */}
            <div className="flex border-b border-white/5 shrink-0">
              <button
                onClick={() => setRightPanel('ranking')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  rightPanel === 'ranking'
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Trophy size={13} />
                Ranking
              </button>
              <button
                onClick={() => setRightPanel('members')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  rightPanel === 'members'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Users size={13} />
                Miembros
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanel === 'ranking' ? (
                <div className="p-4 h-full overflow-y-auto">
                  <RankingPanel communityId={community.id} compact />
                </div>
              ) : (
                <CommunityMemberList
                  communityId={community.id}
                  memberCount={community.member_count}
                />
              )}
            </div>
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

      {/* Bottom sheet miembros — solo mobile */}
      <AnimatePresence>
        {showMobileMembers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileMembers(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a24] border-t border-white/10 rounded-t-2xl z-50 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-cyan-400" />
                  <span className="font-semibold text-white text-sm">Miembros</span>
                </div>
                <button
                  onClick={() => setShowMobileMembers(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CommunityMemberList
                  communityId={community.id}
                  memberCount={community.member_count}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom sheet ranking — solo mobile */}
      <AnimatePresence>
        {showMobileRanking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileRanking(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a24] border-t border-white/10 rounded-t-2xl z-50 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-orange-400" />
                  <span className="font-semibold text-white text-sm">Más Activos</span>
                </div>
                <button
                  onClick={() => setShowMobileRanking(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                <RankingPanel communityId={community.id} compact />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
