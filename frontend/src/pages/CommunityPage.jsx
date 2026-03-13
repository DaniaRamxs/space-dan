/**
 * Community Page - Mobile First Design
 * Vista principal de comunidad con diseño mobile-first
 * 
 * Mobile: Layout vertical con bottom tabs
 * Desktop: Layout 3 columnas tradicional
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line @typescript-eslint/no-unused-vars
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
import HoloCard from '../components/HoloCard';
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

  const loadCommunity = useCallback(async () => {
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
  }, [slug, user]);

  useEffect(() => {
    if (slug) loadCommunity();
  }, [slug, loadCommunity]);

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
                      communityName={community.name}
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
            <VoicePanel communityId={community.id} communityName={community.name} isMember={isMember} compact />
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const channelId = `community-${communityId}`;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await chatService.getRecentMessages(50, channelId);
      setMessages(msgs);
    } catch (error) {
      console.error('[CommunityChat] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

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
  }, [communityId, loadMessages, channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async (content, isVip = false) => {
    if (!content.trim() || sending || !isMember) return;

    setSending(true);
    
    const replyToId = replyingTo?.id;
    
    // Optimistic update - add message immediately to UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content: content,
      user_id: user?.id,
      created_at: new Date().toISOString(),
      is_vip: isVip,
      reply_to_id: replyToId,
      reply_to: replyingTo,
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
    setReplyingTo(null);
    
    try {
      await chatService.sendMessage(content, isVip, replyToId, channelId);
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

  const handleReply = (msg) => {
    setReplyingTo(msg);
    setSelectedMessage(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('global_chat')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensaje eliminado');
    } catch (err) {
      console.error('[CommunityChat] Delete error:', err);
      toast.error('Error al eliminar mensaje');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(newMessage);
    }
  };

  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stopped
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content, isImageClickable = true) => {
    // Check if content is an image markdown
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch) {
      return (
        <img 
          src={imageMatch[1]} 
          alt="imagen" 
          className="max-w-full rounded-lg mt-1 max-h-[200px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          onClick={() => isImageClickable && setShowImageModal(imageMatch[1])}
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

      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scroll-smooth relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center mb-5"
            >
              <MessageCircle size={32} className="text-cyan-400/60" />
            </motion.div>
            <p className="text-white/50 text-base font-medium mb-2">No hay mensajes aún</p>
            <p className="text-white/30 text-sm max-w-xs">¡Sé el primero en escribir! Comparte tus ideas, imágenes o GIFs con la comunidad.</p>
            <div className="mt-6 flex gap-2">
              <div className="px-3 py-1.5 bg-white/[0.03] rounded-full text-xs text-white/40 border border-white/[0.06]">Imágenes</div>
              <div className="px-3 py-1.5 bg-white/[0.03] rounded-full text-xs text-white/40 border border-white/[0.06]">GIFs</div>
              <div className="px-3 py-1.5 bg-white/[0.03] rounded-full text-xs text-white/40 border border-white/[0.06]">Emoji</div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.user_id === user?.id;
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            
            // Grouping logic
            const isFirstInGroup = !prevMsg || prevMsg.user_id !== msg.user_id;
            const isLastInGroup = !nextMsg || nextMsg.user_id !== msg.user_id;
            const timeDiff = prevMsg ? new Date(msg.created_at) - new Date(prevMsg.created_at) : 0;
            const showTimeSeparator = isFirstInGroup || timeDiff > 5 * 60 * 1000; // 5 minutes
            
            return (
              <div key={msg.id}>
                {/* Time separator */}
                {showTimeSeparator && (
                  <div className="flex items-center justify-center my-3">
                    <div className="px-3 py-1 bg-white/[0.03] rounded-full text-[10px] text-white/30 border border-white/[0.06]">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`group flex gap-2 hover:bg-white/[0.02] rounded-lg transition-colors -mx-2 px-2 py-1 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar - only show on first message in group */}
                  <div className="w-8 flex-shrink-0 pt-0.5">
                    {isFirstInGroup ? (
                      <motion.img
                        whileHover={{ scale: 1.1 }}
                        src={msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`}
                        alt={msg.author?.username}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/[0.1] cursor-pointer"
                        onClick={() => msg.author && setSelectedProfile(msg.author)}
                      />
                    ) : (
                      <div className="w-8 flex justify-center">
                        <span className="text-[9px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                          {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[75%] lg:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Username - only on first message */}
                    {isFirstInGroup && (
                      <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
                        <span className="text-xs font-medium text-white/60 hover:text-white/80 transition-colors cursor-pointer">
                          {msg.author?.username || 'Anónimo'}
                        </span>
                        <ReputationBadge points={msg.author?.reputation?.points || 0} size="sm" />
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div 
                      className={`relative px-3.5 py-2 text-sm leading-relaxed overflow-hidden group/message cursor-pointer transition-all ${
                        isOwn 
                          ? 'bg-cyan-500 text-cyan-950 rounded-2xl rounded-br-sm' 
                          : 'bg-white/[0.07] text-white/90 rounded-2xl rounded-bl-sm border border-white/[0.05] hover:border-white/[0.1]'
                      } ${!isLastInGroup ? (isOwn ? 'rounded-br-lg' : 'rounded-bl-lg') : ''}`}
                    >
                      {renderMessageContent(msg.content)}
                      
                      {/* Hover actions */}
                      <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex gap-1 px-2`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toast.success('Reacciones próximamente'); }}
                          className="p-1.5 bg-[#1a1a24] border border-white/[0.1] rounded-lg text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-lg"
                          title="Reaccionar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                          className="p-1.5 bg-[#1a1a24] border border-white/[0.1] rounded-lg text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-lg"
                          title="Responder"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedMessage(selectedMessage === msg.id ? null : msg.id); }}
                          className="p-1.5 bg-[#1a1a24] border border-white/[0.1] rounded-lg text-white/60 hover:text-red-400 hover:border-red-500/30 transition-all shadow-lg relative"
                          title="Más opciones"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                          
                          {/* Message Options Dropdown */}
                          {selectedMessage === msg.id && (
                            <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 w-36 bg-[#1a1a24] border border-white/[0.1] rounded-lg shadow-xl py-1 z-50`}>
                              {isOwn && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setSelectedMessage(null); }}
                                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                  Eliminar
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content.replace(/!\[.*?\]\((.*?)\)/, '$1')); toast.success('Contenido copiado'); setSelectedMessage(null); }}
                                className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                Copiar
                              </button>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 p-3 bg-cyan-500 text-cyan-950 rounded-full shadow-lg hover:bg-cyan-400 transition-all z-10"
              title="Ir al final"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 pb-4">
        <div className="h-[80px] lg:hidden" />
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-white/40">
              {typingUsers.length === 1 
                ? `${typingUsers[0]} está escribiendo...` 
                : `${typingUsers.length} personas están escribiendo...`}
            </span>
          </div>
        )}
        
        {/* Reply Preview */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-2 bg-white/[0.03] rounded-lg border-l-2 border-cyan-500">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-cyan-400 font-medium">
                Respondiendo a {replyingTo.author?.username || 'Anónimo'}
              </p>
              <p className="text-xs text-white/50 truncate">
                {replyingTo.content?.length > 50 ? replyingTo.content.substring(0, 50) + '...' : replyingTo.content}
              </p>
            </div>
            <button 
              onClick={handleCancelReply}
              className="p-1 text-white/40 hover:text-white/70 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        
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
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
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
      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={showImageModal}
              alt="Imagen ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(null)}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* User Profile HoloCard */}
      {selectedProfile && (
        <HoloCard 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function VoicePanel({ communityId, communityName, isMember, compact }) {
  const navigate = useNavigate();
  const [voiceRooms, setVoiceRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVoiceRooms = useCallback(async () => {
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
  }, [communityId]);

  useEffect(() => {
    loadVoiceRooms();
    const interval = setInterval(loadVoiceRooms, 30000);
    return () => clearInterval(interval);
  }, [communityId, loadVoiceRooms]);

  const handleJoinRoom = (roomId) => {
    navigate(`/chat?voice=${roomId}`);
  };

  const handleCreateVoiceRoom = async () => {
    if (!isMember || !communityId) return;
    
    try {
      // Create community voice activity via API
      const activity = await liveActivitiesService.createActivity({
        type: 'voice',
        title: 'Sala General',
        communityId: communityId,
        roomName: `community-${communityId}`,
        metadata: { createdFrom: 'community_page', communityName }
      });
      
      // Navigate to voice room with the created activity ID
      navigate(`/chat?voice=${activity.id}`);
    } catch (err) {
      console.error('[VoicePanel] Failed to create community voice room:', err);
      // Fallback to local voice room creation
      navigate(`/chat?voice=community-${communityId}`);
    }
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
              onClick={handleCreateVoiceRoom}
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
              whileHover={{ scale: 1.02 }}
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

  useEffect(() => {
    loadRanking();
  }, [communityId, loadRanking]);

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
