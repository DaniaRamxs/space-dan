import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, West, ChevronLeft, Tv, MessageSquare } from 'lucide-react';
import { animeService } from './animeService';
import AnimeSearch from './AnimeSearch';
import AnimeEpisodeList from './AnimeEpisodeList';
import AnimePlayer from './AnimePlayer';
import { useAuthContext } from '../../contexts/AuthContext';
import { joinOrCreateRoom } from '../../services/colyseusClient';
import { liveActivitiesService } from '../../services/liveActivitiesService';
import toast from 'react-hot-toast';

const AnimeSpacePage = ({ onClose }) => {
    const { profile } = useAuthContext();
    const navigate = useNavigate();
    const [view, setView] = useState('search'); // 'search', 'episodes', 'player'
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [streamData, setStreamData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Colyseus state
    const [room, setRoom] = useState(null);
    const [roomState, setRoomState] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleAnimeSelect = async (anime) => {
        setLoading(true);
        setSelectedAnime(anime);
        try {
            const info = await animeService.getAnimeInfo(anime.id);
            setEpisodes(info.episodes || []);
            setView('episodes');
        } catch (error) {
            toast.error('Failed to load episodes');
        } finally {
            setLoading(false);
        }
    };

    const handleEpisodeSelect = async (episode) => {
        setLoading(true);
        setCurrentEpisode(episode);
        try {
            const sources = await animeService.getEpisodeSources(episode.id);
            setStreamData(sources);
            
            // Create activity in Supabase so others see it in the stream
            let supabaseActivity = null;
            try {
                supabaseActivity = await liveActivitiesService.createActivity({
                    type: 'anime',
                    title: `${selectedAnime.title} - Ep ${episode.number}`,
                    metadata: {
                        animeId: selectedAnime.id,
                        animeTitle: selectedAnime.title,
                        episodeId: episode.id,
                        episodeNumber: episode.number,
                        image: selectedAnime.image
                    }
                });
            } catch (err) {
                console.warn('Failed to create supabase activity, but continuing...', err);
            }

            // Join Colyseus Room
            const roomId = `anime-${episode.id}-${profile?.id?.slice(0, 5)}`;
            const newRoom = await joinOrCreateRoom('anime', {
                roomId,
                activityId: supabaseActivity?.id,
                animeId: selectedAnime.id,
                animeTitle: selectedAnime.title,
                episodeId: episode.id,
                episodeNumber: episode.number,
                userId: profile?.id,
                username: profile?.username,
                avatar: profile?.avatar_url,
                hostId: profile?.id
            });

            setRoom(newRoom);
            
            // Listen for state changes
            newRoom.onStateChange((state) => {
                setRoomState(state.toJSON());
                const parts = [];
                state.participants.forEach(p => parts.push(p));
                setParticipants(parts);
            });

            // Listen for chat
            newRoom.onMessage("chat", (message) => {
                setChatMessages((prev) => [...prev, message]);
            });

            setView('player');
        } catch (error) {
            console.error(error);
            toast.error('Failed to start episode');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !room) return;
        room.send("chat", chatInput);
        setChatInput('');
    };

    const handleTimeUpdate = (time) => {
        // Only host sends sync periodically or on major events
        // For simplicity, we can let AnimePlayer call specific sync events
    };

    const handlePlay = (time) => {
        if (room && roomState?.hostId === profile?.id) {
            room.send("play", { currentTime: time });
        }
    };

    const handlePause = (time) => {
        if (room && roomState?.hostId === profile?.id) {
            room.send("pause", { currentTime: time });
        }
    };

    const handleSeek = (time) => {
        if (room && roomState?.hostId === profile?.id) {
            room.send("seek", { currentTime: time });
        }
    };

    const isHost = roomState?.hostId === profile?.id;

    return (
        <div className="min-h-screen bg-[#030308] text-white selection:bg-purple-500/30">
            {/* Header - Only show if not in activity mode */}
            {!onClose && (
                <header className="sticky top-0 z-50 bg-[#030308]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {view !== 'search' && (
                        <button 
                            onClick={() => setView(view === 'player' ? 'episodes' : 'search')}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
                            <Tv size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">Anime Space</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold">Explorar</button>
                        <button className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium text-white/60">Tendencias</button>
                        <button className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium text-white/60">Mi Lista</button>
                    </nav>
                </div>
            </header>
        )}

            {onClose && (
                <div className="fixed top-6 right-6 z-[100] flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all"
                    >
                        Cerrar Anime
                    </button>
                </div>
            )}

            <main className="container mx-auto py-8">
                {view === 'search' && (
                    <AnimeSearch onSelect={handleAnimeSelect} />
                )}

                {view === 'episodes' && selectedAnime && (
                    <AnimeEpisodeList 
                        anime={selectedAnime} 
                        episodes={episodes} 
                        onSelect={handleEpisodeSelect}
                        currentEpisodeId={currentEpisode?.id}
                    />
                )}

                {view === 'player' && streamData && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4 max-w-[1600px] mx-auto">
                        <div className="lg:col-span-3 space-y-6">
                            <AnimePlayer 
                                src={streamData.sources[0]?.url} 
                                subtitles={streamData.subtitles}
                                isHost={isHost}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onSeek={handleSeek}
                                externalState={{
                                    isPlaying: roomState?.isPlaying,
                                    currentTime: roomState?.currentTime
                                }}
                            />
                            
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h1 className="text-2xl font-black">{selectedAnime?.title}</h1>
                                    <span className="px-3 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold uppercase tracking-widest">
                                        Episodio {currentEpisode?.number}
                                    </span>
                                </div>
                                <p className="text-white/60 leading-relaxed">
                                    {selectedAnime?.description}
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-1 flex flex-col gap-6 h-[calc(100vh-180px)]">
                            {/* Participants */}
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col flex-1 overflow-hidden backdrop-blur-xl">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                                    <Users size={14} />
                                    En la sala ({participants.length})
                                </h3>
                                <div className="flex -space-x-2 overflow-hidden mb-6">
                                    {participants.map((p, i) => (
                                        <div key={i} className="relative group">
                                            <img 
                                                className="inline-block h-10 w-10 rounded-full ring-2 ring-[#030308] object-cover" 
                                                src={p.avatar || '/default-avatar.png'} 
                                                alt={p.username} 
                                            />
                                            {p.isHost && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-[#030308] flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Chat */}
                                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <img src={msg.avatar || '/default-avatar.png'} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                                            <div>
                                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-tighter">{msg.username}</p>
                                                <p className="text-sm text-white/80 bg-white/5 px-3 py-2 rounded-2xl rounded-tl-none mt-1 border border-white/5">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="relative">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Escribe algo..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-400 transition-colors"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {loading && (
                <div className="fixed inset-0 bg-[#030308]/60 backdrop-blur-md z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-purple-400 font-bold tracking-widest uppercase text-xs">Cargando experiencia...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnimeSpacePage;
