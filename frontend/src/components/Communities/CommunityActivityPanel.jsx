/**
 * Community Activity Panel
 * Muestra salas de voz activas y ranking de miembros
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Users, Trophy, Flame } from 'lucide-react';
import { liveActivitiesService } from '../../services/liveActivitiesService';
import { communitiesService } from '../../services/communitiesService';
import { useNavigate } from 'react-router-dom';

export default function CommunityActivityPanel({ communityId, isMember }) {
    const navigate = useNavigate();
    const [voiceRooms, setVoiceRooms] = useState([]);
    const [activeMembers, setActiveMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivityData();
        
        // Actualizar cada 30 segundos
        const interval = setInterval(loadActivityData, 30000);
        return () => clearInterval(interval);
    }, [communityId]);

    const loadActivityData = async () => {
        try {
            // Cargar salas de voz activas
            const activities = await liveActivitiesService.getTrendingActivities({ limit: 20 });
            const communityVoiceRooms = activities.filter(a => 
                a.community_id === communityId && a.type === 'voice'
            );
            setVoiceRooms(communityVoiceRooms);

            // Cargar miembros activos reales de la comunidad
            const members = await communitiesService.getCommunityMembers(communityId);
            
            // Calcular puntos de actividad: message_count + (chat_level * 10)
            const membersWithPoints = members.map(member => ({
                username: member.username || 'Anónimo',
                avatar: member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`,
                points: (member.message_count || 0) + ((member.chat_level || 0) * 10)
            }));

            // Ordenar por puntos descendente y tomar top 5
            const topMembers = membersWithPoints
                .sort((a, b) => b.points - a.points)
                .slice(0, 5);

            setActiveMembers(topMembers);
        } catch (error) {
            console.error('[CommunityActivityPanel] Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinVoiceRoom = (room) => {
        navigate(`/voice/${room.id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Salas de Voz Activas */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                        Salas de Voz
                    </h3>
                </div>

                {voiceRooms.length === 0 ? (
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center">
                        <Volume2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-xs text-white/40">
                            No hay salas de voz activas
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {voiceRooms.map((room) => (
                            <motion.div
                                key={room.id}
                                whileHover={isMember ? { scale: 1.02 } : {}}
                                className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all ${
                                    isMember ? 'cursor-pointer hover:border-cyan-500/30' : 'opacity-60'
                                }`}
                                onClick={isMember ? () => handleJoinVoiceRoom(room) : undefined}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-semibold text-white/90">
                                            {room.name || 'Sala General'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-white/40">
                                        <Users className="w-3 h-3" />
                                        <span>{room.participant_count || 0}</span>
                                    </div>
                                </div>
                                <button 
                                    disabled={!isMember}
                                    className={`w-full py-1.5 border rounded-lg text-xs font-semibold transition-all ${
                                        isMember 
                                            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                                            : 'bg-white/[0.02] border-white/[0.06] text-white/30 cursor-not-allowed'
                                    }`}
                                >
                                    {isMember ? 'Unirse' : 'Solo miembros'}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ranking de Miembros Activos */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                        Más Activos
                    </h3>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                    {activeMembers.map((member, index) => (
                        <div key={member.username} className="flex items-center gap-3">
                            {/* Posición */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-white/[0.05] text-white/40'
                            }`}>
                                {index + 1}
                            </div>

                            {/* Avatar */}
                            <img
                                src={member.avatar}
                                alt={member.username}
                                className="w-8 h-8 rounded-full"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white/90 truncate">
                                    {member.username}
                                </p>
                            </div>

                            {/* Puntos */}
                            <div className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs font-bold text-cyan-300">
                                    {member.points}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
