/**
 * EnhancedChatSystem.jsx
 * Sistema de chat mejorado con reacciones, comandos y modos
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Send, Smile, Mic, MicOff, Users, Settings, Volume2,
    Heart, ThumbsUp, Laugh, Fire, Gift, Star, Music,
    Palette, Zap, Shield, Crown, Sparkles
} from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Reacciones disponibles
const REACTIONS = {
    heart: { icon: Heart, color: 'text-rose-400', label: '❤️' },
    thumbsup: { icon: ThumbsUp, color: 'text-emerald-400', label: '👍' },
    laugh: { icon: Laugh, color: 'text-yellow-400', label: '😂' },
    fire: { icon: Fire, color: 'text-orange-400', label: '🔥' },
    gift: { icon: Gift, color: 'text-purple-400', label: '🎁' },
    star: { icon: Star, color: 'text-amber-400', label: '⭐' }
};

// Comandos disponibles
const COMMANDS = {
    '/help': 'Muestra todos los comandos',
    '/clear': 'Limpia el chat',
    '/me': 'Acción personalizada',
    '/nick': 'Cambiar nombre temporal',
    '/color': 'Cambiar color del texto',
    '/emoji': 'Lista de emojis',
    '/music': 'Info de la canción actual',
    '/users': 'Lista de usuarios conectados',
    '/roll': 'Tirar dado (1-100)',
    '/8ball': 'Bola 8 mágica',
    '/time': 'Hora actual del servidor',
    '/weather': 'Clima virtual',
    '/dance': 'Modo baile activado',
    '/chill': 'Modo relajación activado',
    '/party': 'Modo fiesta activado'
};

export default function EnhancedChatSystem({ roomName, isMinimized = false }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [activeMode, setActiveMode] = useState('normal'); // normal, chill, party, dance
    const [chatColor, setChatColor] = useState('#ffffff');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [ambientLighting, setAmbientLighting] = useState('off');
    
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);

    // Emojis más comunes
    const commonEmojis = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '💯', '🎵', '🎮', '🌟', '✨', '🎁', '🎯', '💪', '🚀'];

    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `chat-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(chanName);
        channelRef.current = channel;

        // Escuchar mensajes del chat
        channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
            setMessages(prev => [...prev.slice(-50), payload]);
        });

        // Escuchar reacciones
        channel.on('broadcast', { event: 'chat_reaction' }, ({ payload }) => {
            setMessages(prev => {
                const updated = [...prev];
                const messageIndex = updated.findIndex(m => m.id === payload.messageId);
                if (messageIndex !== -1) {
                    if (!updated[messageIndex].reactions) {
                        updated[messageIndex].reactions = {};
                    }
                    updated[messageIndex].reactions[payload.type] = (updated[messageIndex].reactions[payload.type] || 0) + 1;
                }
                return updated;
            });
        });

        // Escuchar usuarios escribiendo
        channel.on('broadcast', { event: 'typing_start' }, ({ payload }) => {
            setOnlineUsers(prev => [...prev.filter(u => u.id !== payload.userId), { ...payload, isTyping: true }]);
        });

        channel.on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
            setOnlineUsers(prev => [...prev.filter(u => u.id !== payload.userId), { ...payload, isTyping: false }]);
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [roomName, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!inputMessage.trim() || !channelRef.current) return;

        // Procesar comandos
        if (inputMessage.startsWith('/')) {
            handleCommand(inputMessage);
            setInputMessage('');
            return;
        }

        const message = {
            id: Date.now(),
            userId: user?.id,
            username: profile?.username || 'Anon',
            avatar: profile?.avatar_url || '/default-avatar.png',
            content: inputMessage.trim(),
            timestamp: Date.now(),
            color: chatColor,
            reactions: {}
        };

        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: message
        });

        setInputMessage('');
        setIsTyping(false);
    };

    const handleCommand = (command) => {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        switch (cmd) {
            case '/help':
                const helpText = Object.entries(COMMANDS)
                    .map(([cmd, desc]) => `${cmd}: ${desc}`)
                    .join('\n');
                toast.success('Comandos disponibles:\n' + helpText);
                break;
            case '/clear':
                setMessages([]);
                toast.success('Chat limpiado');
                break;
            case '/me':
                if (args) {
                    const actionMessage = `*${profile?.username} ${args}*`;
                    // Enviar como mensaje especial
                    toast.success('Acción enviada: ' + actionMessage);
                }
                break;
            case '/nick':
                if (args) {
                    toast.success('Nombre temporal cambiado a: ' + args);
                }
                break;
            case '/color':
                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#d63031'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                setChatColor(randomColor);
                toast.success('Color de chat cambiado');
                break;
            case '/music':
                toast.success('🎵 Música actual: Loading...');
                break;
            case '/users':
                toast.success(`👥 Usuarios conectados: ${participants.length + 1}`);
                break;
            case '/roll':
                const roll = Math.floor(Math.random() * 100) + 1;
                toast.success(`🎲 Dado: ${roll}`);
                break;
            case '/8ball':
                const responses = ['Sí', 'No', 'Quizás', 'Pregunta de nuevo', 'Definitivamente no', 'Las estrellas alinean'];
                const response = responses[Math.floor(Math.random() * responses.length)];
                toast.success(`🎱 Bola 8: ${response}`);
                break;
            case '/time':
                toast.success(`🕐 Hora: ${new Date().toLocaleTimeString()}`);
                break;
            case '/weather':
                const weathers = ['☀️ Soleado', '⛅ Nublado', '🌧 Lluvia ligera', '⛈ Tormenta', '🌈 Arcoíris'];
                const weather = weathers[Math.floor(Math.random() * weathers.length)];
                toast.success(`🌤 Clima virtual: ${weather}`);
                break;
            case '/dance':
                setActiveMode('dance');
                setAmbientLighting('rainbow');
                toast.success('🕺 Modo baile activado');
                break;
            case '/chill':
                setActiveMode('chill');
                setAmbientLighting('blue');
                toast.success('🌊 Modo relajación activado');
                break;
            case '/party':
                setActiveMode('party');
                setAmbientLighting('multicolor');
                toast.success('🎉 Modo fiesta activado');
                break;
            default:
                toast.error('Comando no reconocido. Usa /help para ver comandos.');
        }
    };

    const addReaction = (messageId, reactionType) => {
        if (!channelRef.current) return;

        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_reaction',
            payload: { messageId, type: reactionType, userId: user?.id }
        });

        // Animación local inmediata
        setSelectedReaction(reactionType);
        setTimeout(() => setSelectedReaction(null), 300);
    };

    const handleTypingStart = () => {
        if (!isTyping && channelRef.current) {
            setIsTyping(true);
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing_start',
                payload: { userId: user?.id, username: profile?.username }
            });
        }
    };

    const handleTypingStop = () => {
        if (isTyping && channelRef.current) {
            setIsTyping(false);
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing_stop',
                payload: { userId: user?.id }
            });
        }
    };

    const getModeIcon = () => {
        switch (activeMode) {
            case 'dance': return <Music className="animate-pulse" />;
            case 'chill': return <Volume2 className="animate-pulse" />;
            case 'party': return <Sparkles className="animate-pulse" />;
            default: return <Users />;
        }
    };

    const getModeColor = () => {
        switch (activeMode) {
            case 'dance': return 'from-purple-600 to-pink-600';
            case 'chill': return 'from-blue-600 to-cyan-600';
            case 'party': return 'from-yellow-600 to-orange-600';
            default: return 'from-gray-600 to-gray-700';
        }
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-[10003] bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 text-white">
                    <MessageCircle size={16} className="text-green-400" />
                    <span className="text-sm font-bold">Chat</span>
                    <span className="text-xs text-white/60">{messages.length}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-80 top-4 z-[10002] w-80 h-96 bg-black/90 backdrop-blur-2xl rounded-3xl border border-white/10 flex flex-col shadow-2xl">
            {/* Header del chat */}
            <div className={`bg-gradient-to-r ${getModeColor()} p-4 rounded-t-3xl border-b border-white/10`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getModeIcon()}
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">
                            Chat {activeMode === 'normal' ? '' : activeMode}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all"
                        >
                            <Smile size={16} />
                        </button>
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all"
                        >
                            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button
                            onClick={() => setActiveMode('normal')}
                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensajes del chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                        >
                            <img src={message.avatar} className="w-8 h-8 rounded-full" alt="" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-white/60">
                                        {message.username}
                                    </span>
                                    <span className="text-xs text-white/40">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p 
                                    className="text-sm text-white break-words"
                                    style={{ color: message.color }}
                                >
                                    {message.content}
                                </p>
                                
                                {/* Reacciones */}
                                {message.reactions && Object.keys(message.reactions).length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                        {Object.entries(message.reactions).map(([type, count]) => {
                                            const reaction = REACTIONS[type];
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => addReaction(message.id, type)}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg ${reaction.color} bg-white/10 hover:bg-white/20 transition-all text-xs`}
                                                >
                                                    <reaction.icon size={12} />
                                                    <span className="font-bold">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Usuarios escribiendo */}
            {onlineUsers.filter(u => u.isTyping).length > 0 && (
                <div className="px-4 pb-2">
                    <div className="text-xs text-white/40 italic">
                        {onlineUsers.filter(u => u.isTyping).map(u => u.username).join(', ')} 
                        {onlineUsers.filter(u => u.isTyping).length === 1 ? 'está escribiendo...' : 'están escribiendo...'}
                    </div>
                </div>
            )}

            {/* Selector de emojis */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-20 left-4 right-4 bg-black/95 backdrop-blur-xl rounded-2xl p-4 border border-white/20"
                    >
                        <div className="grid grid-cols-8 gap-2 mb-3">
                            {commonEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        setInputMessage(prev => prev + emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                    className="text-2xl hover:bg-white/10 rounded p-2 transition-all"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-white/40 text-center">
                            Escribe directamente o usa comandos con /
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                sendMessage();
                            }
                        }}
                        onFocus={handleTypingStart}
                        onBlur={handleTypingStop}
                        placeholder="Escribe un mensaje o comando..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                        disabled={isMuted}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isMuted}
                        className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
