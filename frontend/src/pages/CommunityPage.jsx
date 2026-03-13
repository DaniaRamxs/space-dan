/**
 * Community Page - Mobile First Design
 * Vista principal de comunidad con diseño mobile-first
 * 
 * Mobile: Layout vertical con bottom tabs
 * Desktop: Layout 3 columnas tradicional
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ArrowLeft, UserPlus, MessageCircle, Volume2, Trophy,
  Send, MoreVertical, Hash, Radio, ImageIcon
} from 'lucide-react';
import { communitiesService } from '../services/communitiesService';
import { chatService } from '../services/chatService';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { liveActivitiesService } from '../services/liveActivitiesService';
import { addMessagePoints, getCommunityRanking } from '../services/reputationService';
import ReputationBadge from '../components/Reputation/ReputationBadge';
import StellarScrollBg from '../components/Effects/StellarScrollBg';
import toast from 'react-hot-toast';

// Giphy integration
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [community, setCommunity] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);

  useEffect(() => {
    if (slug) loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const communityData = await communitiesService.getCommunityBySlug(slug);
      setCommunity(communityData);
      
      if (user && communityData.id) {
        const membership = await communitiesService.checkMembership(communityData.id);
        setIsMember(membership);
      }
    } catch (error) {
      console.error('[CommunityPage] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await communitiesService.joinCommunity(community.id);
      setIsMember(true);
      setCommunity(prev => ({ ...prev, member_count: (prev.member_count || 0) + 1 }));
      toast.success('¡Te uniste a la comunidad!');
    } catch (error) {
      console.error('[CommunityPage] Join error:', error);
      toast.error('Error al unirse');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await communitiesService.leaveCommunity(community.id);
      setIsMember(false);
      setCommunity(prev => ({ ...prev, member_count: Math.max(0, (prev.member_count || 0) - 1) }));
      toast.success('Saliste de la comunidad');
    } catch (error) {
      console.error('[CommunityPage] Leave error:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleInvite = () => {
    const inviteUrl = `${window.location.origin}/community/${slug}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('¡Link copiado al portapapeles!');
  };

  if (loading) {
    return <CommunitySkeleton />;
  }

  if (!community) {
    return (
      <main className="w-full min-h-screen bg-[#0a0a0f] text-white font-sans flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 text-lg">Comunidad no encontrada</p>
          <button 
            onClick={() => navigate('/communities')} 
            className="mt-4 px-6 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 hover:bg-cyan-500/20 transition-all"
          >
            Volver a comunidades
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-screen bg-[#0a0a0f] text-white font-sans relative overflow-hidden flex flex-col">
      <StellarScrollBg />
      
      {/* Header Móvil - Fixed */}
      <MobileHeader 
        community={community} 
        onBack={() => navigate('/communities')}
        isMember={isMember}
        onJoin={handleJoinCommunity}
        onLeave={handleLeaveCommunity}
        joining={joining}
        user={user}
        onVoiceClick={() => setShowVoiceModal(true)}
        onRankingClick={() => setShowRankingModal(true)}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden lg:overflow-auto">
        {/* Mobile Layout */}
        <div className="lg:hidden h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CommunityChat 
              communityId={community.id}
              communityName={community.name}
              isMember={isMember}
            />
          </div>

          {/* Voice Modal */}
          <AnimatePresence>
            {showVoiceModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <h2 className="font-bold text-white/90 flex items-center gap-2">
                      <Volume2 size={20} className="text-cyan-400" />
                      Salas de Voz
                    </h2>
                    <button
                      onClick={() => setShowVoiceModal(false)}
                      className="p-2 rounded-xl hover:bg-white/5 text-white/60"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <VoicePanel 
                      communityId={community.id}
                      isMember={isMember}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ranking Modal */}
          <AnimatePresence>
            {showRankingModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <h2 className="font-bold text-white/90 flex items-center gap-2">
                      <Trophy size={20} className="text-orange-400" />
                      Ranking
                    </h2>
                    <button
                      onClick={() => setShowRankingModal(false)}
                      className="p-2 rounded-xl hover:bg-white/5 text-white/60"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <RankingPanel communityId={community.id} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Layout - 3 Columns */}
        <div className="hidden lg:flex max-w-[1600px] mx-auto h-full gap-6 p-6">
          {/* Left Panel */}
          <div className="w-72 flex-shrink-0 space-y-4">
            <CommunityInfoCard 
              community={community}
              isMember={isMember}
              onJoin={handleJoinCommunity}
              onLeave={handleLeaveCommunity}
              onInvite={handleInvite}
              joining={joining}
              user={user}
            />
          </div>

          {/* Center Panel */}
          <div className="flex-1 min-w-0">
            <CommunityChat 
              communityId={community.id}
              communityName={community.name}
              isMember={isMember}
            />
          </div>

          {/* Right Panel */}
          <div className="w-80 flex-shrink-0 space-y-4">
            <VoicePanel communityId={community.id} isMember={isMember} compact />
            <RankingPanel communityId={community.id} compact />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tabs */}
      <MobileBottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE HEADER
// ═══════════════════════════════════════════════════════════════════════════════

function MobileHeader({ community, onBack, isMember, onJoin, onLeave, joining, user, onVoiceClick, onRankingClick }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-3">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </button>

        <div className="flex-1 text-center px-2">
          <div className="flex items-center justify-center gap-2">
            {community?.avatar_url ? (
              <img src={community.avatar_url} alt="" className="w-6 h-6 rounded-lg object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
                <Hash size={12} className="text-cyan-400" />
              </div>
            )}
            <h1 className="font-bold text-white/90 truncate max-w-[120px]">
              {community?.name}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3 mt-1">
            <p className="text-[10px] text-white/40 flex items-center gap-1">
              <Users size={10} />
              {community?.member_count?.toLocaleString() || 0}
            </p>
            {/* Quick access buttons in header */}
            <button
              onClick={onVoiceClick}
              className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-full text-[9px] text-cyan-300 transition-colors"
            >
              <Volume2 size={10} />
              Voz
            </button>
            <button
              onClick={onRankingClick}
              className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-full text-[9px] text-orange-300 transition-colors"
            >
              <Trophy size={10} />
              Ranking
            </button>
          </div>
        </div>

        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 -mr-2 rounded-xl hover:bg-white/5 transition-colors relative"
        >
          <MoreVertical size={20} className="text-white/70" />
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#12121a] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
              >
                {user && (
                  <button
                    onClick={() => {
                      isMember ? onLeave() : onJoin();
                      setShowMenu(false);
                    }}
                    disabled={joining}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      isMember 
                        ? 'text-rose-400 hover:bg-rose-500/10' 
                        : 'text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    {joining ? 'Cargando...' : isMember ? 'Salir de comunidad' : 'Unirse a comunidad'}
                  </button>
                )}
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/community/${community?.slug}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copiado');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  Copiar link de invitación
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE BOTTOM TABS
// ═══════════════════════════════════════════════════════════════════════════════

function MobileBottomTabs() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/[0.06] pb-safe">
      <div className="flex items-center justify-center px-2 py-3">
        <div className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-cyan-400 bg-cyan-500/10">
          <MessageCircle size={22} />
          <span className="text-sm font-medium">Chat de Comunidad</span>
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY CHAT
// ═══════════════════════════════════════════════════════════════════════════════

function CommunityChat({ communityId, communityName, isMember }) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelId = `community-${communityId}`;

  useEffect(() => {
    loadMessages();
    
    const subscription = supabase
      .channel(`community-chat-${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_chat',
        filter: `channel_id=eq.${channelId}`
      }, handleNewMessage)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [communityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await chatService.getRecentMessages(50, channelId);
      setMessages(msgs);
    } catch (error) {
      console.error('[CommunityChat] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = async (payload) => {
    const newMsg = payload.new;
    
    // Check if we already have this message (avoid duplicates)
    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      
      return [...prev, {
        ...newMsg,
        author: newMsg.author || { username: 'Anónimo', id: newMsg.user_id }
      }];
    });
  };

  const handleSendMessage = async (content, isVip = false, replyTo = null) => {
    if (!content.trim() || sending || !isMember) return;

    setSending(true);
    
    // Optimistic update - add message immediately to UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content: content,
      user_id: user?.id,
      created_at: new Date().toISOString(),
      is_vip: isVip,
      reply_to_id: replyTo,
      channel_id: channelId,
      author: {
        id: user?.id,
        username: user?.username || 'Tú',
        avatar_url: user?.avatar_url
      }
    };
    
    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    
    try {
      await chatService.sendMessage(content, isVip, replyTo, channelId);
      await chatService.incrementChatStats();
      
      // Añadir puntos de reputación por mensaje
      if (user?.id) {
        await addMessagePoints(user.id, communityId).catch(err => {
          console.log('[Reputation] No se pudieron añadir puntos:', err);
        });
      }
    } catch (error) {
      console.error('[CommunityChat] Send error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(newMessage);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es demasiado pesada (máx 2MB)');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('Subiendo imagen...', { id: 'upload' });

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat/${channelId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      await handleSendMessage(`![imagen](${publicUrl})`);
      toast.success('Imagen enviada', { id: 'upload' });
    } catch (err) {
      console.error('[CommunityChat] Upload error:', err);
      toast.error('Error al subir imagen', { id: 'upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGifClick = (gif) => {
    const gifMarkdown = `![gif](${gif.images.fixed_height.url})`;
    handleSendMessage(gifMarkdown);
    setShowGiphy(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content) => {
    // Check if content is an image markdown
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch) {
      return (
        <img 
          src={imageMatch[1]} 
          alt="imagen" 
          className="max-w-full rounded-lg mt-1 max-h-[200px] object-contain"
          loading="lazy"
        />
      );
    }
    return content;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a0f] lg:bg-white/[0.02] lg:rounded-2xl lg:border lg:border-white/[0.06]">
        <div className="lg:hidden h-14" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
              <div className={`space-y-2 ${i % 2 === 0 ? '' : 'items-end'}`}>
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] lg:bg-white/[0.02] lg:rounded-2xl lg:border lg:border-white/[0.06]">
      <div className="lg:hidden h-14" />

      {/* Giphy Panel */}
      <AnimatePresence>
        {showGiphy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-[120px] left-4 right-4 z-50 bg-[#12121a] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[350px]"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">GIFs ✨</span>
              <button 
                onClick={() => setShowGiphy(false)} 
                className="text-white/40 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-2 border-b border-white/[0.06]">
              <input
                type="text"
                placeholder="Buscar GIFs..."
                value={gifSearchTerm}
                onChange={(e) => setGifSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <Grid
                key={gifSearchTerm}
                width={window.innerWidth > 640 ? 400 : window.innerWidth - 48}
                columns={2}
                gutter={6}
                fetchGifs={(offset) => gifSearchTerm.trim()
                  ? gf.search(gifSearchTerm, { offset, limit: 10 })
                  : gf.trending({ offset, limit: 10 })
                }
                onGifClick={(gif, e) => {
                  e.preventDefault();
                  handleGifClick(gif);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-white/20" />
            </div>
            <p className="text-white/40 text-sm mb-1">No hay mensajes aún</p>
            <p className="text-white/20 text-xs">¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.user_id === user?.id;
            const prevMsg = messages[index - 1];
            const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id;
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 flex-shrink-0">
                  {showAvatar ? (
                    <img
                      src={msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`}
                      alt={msg.author?.username}
                      className="w-8 h-8 rounded-full bg-white/5"
                    />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>

                <div className={`max-w-[75%] lg:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-[10px] text-white/40">
                        {msg.author?.username || 'Anónimo'}
                      </span>
                      <ReputationBadge points={msg.author?.reputation?.points || 0} size="sm" />
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden ${
                    isOwn 
                      ? 'bg-cyan-500 text-cyan-950 rounded-br-md' 
                      : 'bg-white/[0.08] text-white/90 rounded-bl-md border border-white/[0.06]'
                  }`}>
                    {renderMessageContent(msg.content)}
                  </div>
                  <span className={`text-[9px] text-white/30 mt-1 block ${isOwn ? 'text-right' : ''}`}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4">
        <div className="h-[80px] lg:hidden" />
        
        {!isMember ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className="text-sm text-white/50 mb-2">Únete para participar en el chat</p>
            <button className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-sm text-cyan-300 font-medium">
              Unirse ahora
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage); }} className="relative">
            <div className="flex items-end gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl p-2 focus-within:border-cyan-500/30 focus-within:bg-white/[0.08] transition-all">
              <div className="flex items-center gap-1 mr-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
                  title="Subir imagen"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowGiphy(!showGiphy)}
                  className={`p-2 rounded-lg transition-all ${showGiphy ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                  title="Insertar GIF"
                >
                  <span className="text-sm">GIF</span>
                </button>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensaje en ${communityName}...`}
                disabled={sending || isUploading}
                rows={1}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 resize-none outline-none max-h-32"
                style={{ minHeight: '44px' }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || isUploading}
                className="p-3 bg-cyan-500 text-cyan-950 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-400 transition-all active:scale-95"
              >
                {sending || isUploading ? (
                  <div className="w-5 h-5 border-2 border-cyan-950/30 border-t-cyan-950 rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 text-center lg:text-left">
              Enter para enviar · Shift + Enter para nueva línea · Máx 2MB para imágenes
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function VoicePanel({ communityId, isMember, compact }) {
  const navigate = useNavigate();
  const [voiceRooms, setVoiceRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoiceRooms();
    const interval = setInterval(loadVoiceRooms, 30000);
    return () => clearInterval(interval);
  }, [communityId]);

  const loadVoiceRooms = async () => {
    try {
      const activities = await liveActivitiesService.getTrendingActivities({ limit: 20 });
      const rooms = activities.filter(a => 
        a.community_id === communityId && a.type === 'voice'
      );
      setVoiceRooms(rooms);
    } catch (error) {
      console.error('[VoicePanel] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/chat?voice=${roomId}`);
  };

  if (loading) {
    return (
      <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 ${compact ? '' : 'm-4'}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-white/5 rounded" />
          <div className="h-12 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Volume2 size={16} className="text-cyan-400" />
        </div>
        <h3 className="font-bold text-white/90">Salas de Voz</h3>
      </div>

      {voiceRooms.length === 0 ? (
        <div className="text-center py-6">
          <Radio size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-4">No hay salas activas</p>
          {isMember && (
            <button
              onClick={() => navigate(`/chat?voice=community-${communityId}`)}
              className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-semibold text-cyan-300 transition-all active:scale-95"
            >
              Crear sala general
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {voiceRooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={isMember ? { scale: 1.02 } : {}}
              className={`p-3 rounded-xl border transition-all ${
                isMember 
                  ? 'bg-white/[0.03] border-white/[0.06] hover:border-cyan-500/30 cursor-pointer' 
                  : 'bg-white/[0.02] border-white/[0.06] opacity-50'
              }`}
              onClick={() => isMember && handleJoinRoom(room.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    <Volume2 size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white/90 text-sm">{room.name || 'Sala General'}</p>
                    <div className="flex items-center gap-1 text-xs text-white/40">
                      <Users size={12} />
                      <span>{room.participant_count || 0} en voz</span>
                    </div>
                  </div>
                </div>
                <button
                  disabled={!isMember}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isMember
                      ? 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                      : 'bg-white/[0.03] text-white/30'
                  }`}
                >
                  {isMember ? 'Unirse' : 'Solo miembros'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANKING PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function RankingPanel({ communityId, compact }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, [communityId]);

  const loadRanking = useCallback(async () => {
    try {
      const data = await getCommunityRanking(communityId, 10);
      setMembers(data.slice(0, 5));
    } catch (error) {
      console.error('[RankingPanel] Load error:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  if (loading) {
    return (
      <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 ${compact ? '' : 'm-4'}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1 h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Trophy size={16} className="text-orange-400" />
        </div>
        <h3 className="font-bold text-white/90">Más Activos</h3>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-6 text-white/40 text-sm">
          Aún no hay miembros activos
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-white/[0.05] text-white/40'
              }`}>
                {medals[index]}
              </div>

              <img
                src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                alt={member.username}
                className="w-9 h-9 rounded-full bg-white/5"
              />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white/90 text-sm truncate">{member.username}</p>
                <ReputationBadge points={member.points || 0} size="sm" showName={false} />
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-cyan-400">{member.points || 0}</p>
                <p className="text-[10px] text-white/30">pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY INFO CARD (Desktop)
// ═══════════════════════════════════════════════════════════════════════════════

function CommunityInfoCard({ community, isMember, onJoin, onLeave, onInvite, joining, user }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20" />
      
      <div className="p-4 -mt-10">
        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0f] border-2 border-white/[0.08] p-1">
          {community?.avatar_url ? (
            <img 
              src={community.avatar_url} 
              alt={community.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
              <Users size={28} className="text-cyan-400" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <h2 className="font-bold text-white/90 text-lg">{community?.name}</h2>
          {community?.description && (
            <p className="text-sm text-white/50 mt-1 line-clamp-2">{community.description}</p>
          )}
          
          <div className="flex items-center gap-2 mt-3 text-sm text-white/40">
            <Users size={14} />
            <span>{community?.member_count?.toLocaleString() || 0} miembros</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {user && (
            <button
              onClick={isMember ? onLeave : onJoin}
              disabled={joining}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isMember
                  ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border border-white/[0.1]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-cyan-950'
              }`}
            >
              {joining ? 'Cargando...' : isMember ? 'Salir' : 'Unirse'}
            </button>
          )}

          <button
            onClick={onInvite}
            className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl text-sm font-medium text-white/60 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Invitar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════════════════════

function CommunitySkeleton() {
  return (
    <main className="w-full h-screen bg-[#0a0a0f] text-white font-sans relative overflow-hidden flex flex-col">
      <StellarScrollBg />
      
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex-1 flex justify-center">
            <div className="w-32 h-6 bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 mt-14 lg:mt-0 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto h-full flex gap-6">
          <div className="hidden lg:block w-72">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl h-96 animate-pulse" />
          </div>
          
          <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />
          
          <div className="hidden lg:block w-80 space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl h-48 animate-pulse" />
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl h-64 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/[0.06] h-[80px]">
        <div className="flex items-center justify-around h-full px-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-12 h-8 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
