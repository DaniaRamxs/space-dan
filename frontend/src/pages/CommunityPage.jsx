/**
 * Community Page
 * Vista principal de comunidad con diseño de 3 columnas:
 * - Izquierda: Información de la comunidad
 * - Centro: Chat exclusivo de la comunidad
 * - Derecha: Actividad (salas de voz + ranking)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, UserPlus } from 'lucide-react';
import { communitiesService } from '../services/communitiesService';
import { useAuthContext } from '../contexts/AuthContext';
import CommunityChatPanel from '../components/Communities/CommunityChatPanel';
import CommunityActivityPanel from '../components/Communities/CommunityActivityPanel';
import StellarScrollBg from '../components/Effects/StellarScrollBg';
import toast from 'react-hot-toast';

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [community, setCommunity] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (slug) loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const communityData = await communitiesService.getCommunityBySlug(slug);
      setCommunity(communityData);
      
      // Verificar si el usuario es miembro
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
    } catch (error) {
      console.error('[CommunityPage] Join error:', error);
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
    } catch (error) {
      console.error('[CommunityPage] Leave error:', error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-white/[0.03] rounded-2xl" />
          <div className="h-64 bg-white/[0.03] rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!community) {
    return (
      <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4 text-center">
        <p className="text-white/60">Comunidad no encontrada</p>
        <button onClick={() => navigate('/communities')} className="mt-4 text-cyan-400 hover:text-cyan-300">
          Volver a comunidades
        </button>
      </main>
    );
  }

  const handleInvite = () => {
    const inviteUrl = `${window.location.origin}/community/${slug}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('¡Link de invitación copiado!');
  };

  return (
    <main className="w-full h-screen overflow-hidden text-white font-sans relative">
      <StellarScrollBg />

      {/* Header con botón volver */}
      <div className="border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/communities')}
            className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
          
          {community && (
            <h1 className="text-xl font-bold text-white/90">
              {community.name}
            </h1>
          )}
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-[1800px] mx-auto h-[calc(100vh-73px)] flex gap-6 p-6">
        {/* Left Panel - Community Info */}
        <div className="w-80 flex-shrink-0 space-y-6 overflow-y-auto">
          {/* Community Card */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            {community?.avatar_url ? (
              <img 
                src={community.avatar_url} 
                alt={community.name}
                className="w-full h-40 rounded-xl object-cover mb-4"
              />
            ) : (
              <div className="w-full h-40 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Users size={48} className="text-cyan-400" />
              </div>
            )}

            <h2 className="text-2xl font-black uppercase tracking-tight text-white/90 mb-2">
              {community?.name}
            </h2>

            {community?.description && (
              <p className="text-sm text-white/60 mb-4">
                {community.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
              <Users size={16} />
              <span>{community?.member_count?.toLocaleString() || 0} miembros</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {user && (
                <button
                  onClick={isMember ? handleLeaveCommunity : handleJoinCommunity}
                  disabled={joining}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                    isMember
                      ? 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-white/60'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {joining ? 'Cargando...' : isMember ? 'Salir' : 'Unirse'}
                </button>
              )}

              <button
                onClick={handleInvite}
                className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl text-sm font-semibold text-white/70 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                Invitar
              </button>
            </div>
          </div>
        </div>

        {/* Center Panel - Community Chat */}
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          {community ? (
            <CommunityChatPanel 
              communityId={community.id} 
              communityName={community.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Right Panel - Activity */}
        <div className="w-80 flex-shrink-0 overflow-y-auto">
          {community && <CommunityActivityPanel communityId={community.id} />}
        </div>
      </div>
    </main>
  );
}
