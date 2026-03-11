// v2.8.0 - Discord Mode: Channels & Multi-Room Support 📡🛰️
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useEconomy } from '../../../contexts/EconomyContext';
import * as economyService from '../../../services/economy';
import { chatService } from '../../../services/chatService';
import { activityService } from '../../../services/activityService';
import { createNotification } from '../../../services/supabaseNotifications';
import { supabase } from '../../../supabaseClient';
import ChatMessage, { parseMentions } from './ChatMessage';
import ChatInput from './ChatInput';
import VoicePartyBar from './VoicePartyBar';
import HoloCard from '../../HoloCard';
import { useUniverse } from '../../../contexts/UniverseContext';
import { missionService } from '../../../services/missionService';
import { Trophy, Map, Calendar, Palette } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import { cosmicEventsService } from '../../../services/cosmicEventsService';
import '../../../styles/GlobalChat.css';

// Lazy: solo se cargan cuando el usuario los abre (no al entrar al chat)
const VoiceRoomUI  = lazy(() => import('../../VoiceRoom/VoiceRoomUI'));
const MissionsPanel  = lazy(() => import('../MissionsPanel'));
const StellarCalendar = lazy(() => import('../StellarCalendar'));
const BadgePicker    = lazy(() => import('../BadgePicker'));

// Spinner reutilizable para los Suspense del chat
function ChatSpinner() {
    return (
        <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
    );
}

const HYPERBOT = {
    id: '00000000-0000-0000-0000-000000000bb1',
    username: 'HyperBot',
    avatar_url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=HyperBot&backgroundColor=b6e3f4',
    nickname_style: 'hyperbot',
    level: 999
};

const CHANNELS = [
    { id: 'global', name: 'general', icon: '💬', description: 'Chat principal de la comunidad' },
    { id: 'comandos', name: 'comandos', icon: '🤖', description: 'Interacción exclusiva con HyperBot' },
    { id: 'avisos', name: 'avisos', icon: '📢', description: 'Noticias y actualizaciones' }
];

export default function GlobalChat({ initialActivity = null }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const auth = useAuthContext();
    const user = auth?.user;
    const userProfile = auth?.profile;
    const { balance, awardCoins, transfer, claimDaily } = useEconomy();
    const { onlineUsers, updatePresence } = useUniverse();

    const [activeChannel, setActiveChannel] = useState('global');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVipMode, setIsVipMode] = useState(false);
    const [showVoiceRoom, setShowVoiceRoom] = useState(false);
    const [inVoiceRoom, setInVoiceRoom] = useState(false);
    const [hasJoinedVoice, setHasJoinedVoice] = useState(false);
    const [voiceRoomName, setVoiceRoomName] = useState('Sala Galáctica');
    const [tempVoiceChannel, setTempVoiceChannel] = useState(null);
    const [tempTextChannelId, setTempTextChannelId] = useState(null);
    const [showMissions, setShowMissions] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showBadgePicker, setShowBadgePicker] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeEvents, setActiveEvents] = useState({ meteor: false, eclipse: false });
    const [recentCosmicEvents, setRecentCosmicEvents] = useState([]);
    const [channelStats, setChannelStats] = useState({ messageCount: 0, activityLevel: 0 });

    // Polling de Eventos Cósmicos Globales
    useEffect(() => {
        const checkEvents = async () => {
            const active = await cosmicEventsService.getActiveEvent();
            if (active) {
                const name = active.name.toLowerCase();
                const status = {
                    meteor: name.includes('meteor'),
                    eclipse: name.includes('eclipse')
                };
                setActiveEvents(status);
                activeEventsRef.current.eclipse = status.eclipse;
            } else {
                setActiveEvents({ meteor: false, eclipse: false });
                activeEventsRef.current.eclipse = false;
            }
        };

        checkEvents();
        const interval = setInterval(checkEvents, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sidebar: Cargar eventos recientes y estadísticas
    useEffect(() => {
        const loadSidebarData = async () => {
            const evs = await cosmicEventsService.getUniverseEvents(5);
            setRecentCosmicEvents(evs);

            // Stats ficticias o reales
            setChannelStats({
                messageCount: messages.length * 12, // Simulando día
                activityLevel: (messages.length / 10).toFixed(1)
            });
        };

        loadSidebarData();
        const interval = setInterval(loadSidebarData, 60000);
        return () => clearInterval(interval);
    }, [messages.length]);

    const scrollRef = useRef(null);
    const messagesEndRef = useRef(null);
    const pendingDuel = useRef(null);
    const activeGames = useRef({}); // { [userId]: { type, data } }
    const processedIds = useRef(new Set());
    const activeEventsRef = useRef({ meteor: null, boss: null, marketCrash: null, eclipse: null });
    const lastEventRollRef = useRef(0);

    // ── Auto-join voice room when coming from feed with activity ─────────────
    useEffect(() => {
        if (initialActivity && user && !hasJoinedVoice) {
            // Auto-join voice room when user navigates with activity parameter
            setHasJoinedVoice(true);
            setShowVoiceRoom(true);
            
            // Create temporary voice channel for this activity
            // Use a simple mapping for now to avoid circular imports
            const activityNames = {
                connect4: 'Cosmic 4',
                snake: 'Snake Duel', 
                tetris: 'Tetris Duel',
                poker: 'Poker',
                chess: 'Chess',
                ludo: 'Ludo',
                watch: 'Watch Together',
                starboard: 'Starboard',
                'pixel-galaxy': 'Pixel Galaxy',
                puzzle: 'Puzzle Coop',
                blackjack: 'Blackjack',
                'asteroid-battle': 'Asteroid Battle'
            };
            
            const activityIcons = {
                connect4: '🎮',
                snake: '⚡',
                tetris: '📱',
                poker: '💰',
                chess: '♟️',
                ludo: '🎲',
                watch: '🎬',
                starboard: '✨',
                'pixel-galaxy': '🪐',
                puzzle: '🧩',
                blackjack: '♠️',
                'asteroid-battle': '🚀'
            };
            
            if (activityNames[initialActivity]) {
                setTempVoiceChannel({
                    id: initialActivity,
                    name: activityNames[initialActivity],
                    icon: activityIcons[initialActivity],
                });
                setTempTextChannelId(`activity-${initialActivity}`);
            }
        }
    }, [initialActivity, user, hasJoinedVoice]);

    useEffect(() => {
        loadMessages(activeChannel);

        // Limpiar IDs procesados al cambiar de canal para recargar
        processedIds.current = new Set();

        const channel = supabase
            .channel(`global-chat-${activeChannel}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'global_chat',
                filter: `channel_id=eq.${activeChannel}`
            }, (payload) => {
                handleNewMessage(payload.new.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, activeChannel]);


    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.user_id === user?.id || lastMsg?.user_id === HYPERBOT.id) {
            scrollToBottom(true);
        }
    }, [messages, user?.id]);

    // ── Auto-eventos: cargar estado y timer ──────────────────────
    useEffect(() => {
        if (!user) return;
        loadActiveEvents();
        const interval = setInterval(maybeStartAutoEvent, 12 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadMessages = async (chanId) => {
        setLoading(true);
        try {
            const data = await chatService.getRecentMessages(50, chanId);
            const msgs = Array.isArray(data) ? data : [];
            setMessages(msgs);
            msgs.forEach(m => processedIds.current.add(m.id));
        } catch (err) {
            console.error('[GlobalChat] Load Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewMessage = async (id) => {
        if (processedIds.current.has(id)) return;
        processedIds.current.add(id);

        const { data: msg, error } = await supabase
            .from('global_chat')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !msg) return;
        if (msg.channel_id !== activeChannel) return;

        const existingAuthor = messages.find(m => m.user_id === msg.user_id)?.author;
        let author = existingAuthor;

        if (!author) {
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', msg.user_id).single();
            author = prof || { username: 'Viajero' };
        }

        let content = msg.content;
        let isHyperBot = false;

        if (content.startsWith('[HYPERBOT_MSG]:')) {
            content = content.replace('[HYPERBOT_MSG]:', '');
            author = HYPERBOT;
            isHyperBot = true;
        }

        const fullMessage = { ...msg, content, author, user_id: author.id };

        setMessages(prev => {
            const cleanContent = content.trim();
            const tempIndex = prev.findIndex(m => String(m.id).startsWith('temp-') && m.content.trim() === cleanContent);

            let reply = null;
            if (msg.reply_to_id) {
                const original = prev.find(om => om.id === msg.reply_to_id) || messages.find(om => om.id === msg.reply_to_id);
                if (original) {
                    reply = { content: original.content, author: original.author?.username || 'Anónimo' };
                }
            }

            if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = { ...fullMessage, reply };
                return updated;
            }

            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, { ...fullMessage, reply }].slice(-100);
        });

        if (msg.user_id !== user?.id && !isHyperBot) playNotificationSound();
    };

    const scrollToBottom = (force = false) => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 200;
        if (force || isAtBottom) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    const handleCreateVoiceRoom = (name) => {
        const textChanId = 'voz-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        setVoiceRoomName(name);
        setTempVoiceChannel({ id: `voice-${name}`, name, icon: '🎙️' });
        setTempTextChannelId(textChanId);
        setHasJoinedVoice(true);
        setShowVoiceRoom(true);
        setActiveChannel(textChanId);
    };

    const handleLeaveVoice = useCallback(() => {
        // Clear activity parameter from URL when leaving voice room
        if (searchParams.has('activity')) {
            setSearchParams({});
        }
        
        // Reset voice room state
        setHasJoinedVoice(false);
        setShowVoiceRoom(false);
        setInVoiceRoom(false);
        setTempVoiceChannel(null);
        setTempTextChannelId(null);
        setVoiceRoomName('Sala Galáctica');
        setActiveChannel(prev => prev.startsWith('voz-') ? 'global' : prev);
        updatePresence({ inVoice: false, voiceRoom: null });
    }, [searchParams, setSearchParams, updatePresence]);

    // ── Cargar eventos activos desde DB al montar ────────────────
    const loadActiveEvents = async () => {
        const { data } = await supabase
            .from('bot_events')
            .select('*')
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString());
        if (data) {
            data.forEach(ev => {
                if (ev.type === 'meteor') activeEventsRef.current.meteor = ev;
                else if (ev.type === 'boss') activeEventsRef.current.boss = ev;
                else if (ev.type === 'market_crash') activeEventsRef.current.marketCrash = ev;
                else if (ev.type === 'eclipse') activeEventsRef.current.eclipse = ev;
            });
        }
    };

    // ── Trigger de Lluvia de Meteoritos ──────────────────────────
    const METEOR_KEYWORDS = ['nebula', 'pulsar', 'quasar', 'stardust', 'cosmos', 'aurora', 'solaris', 'vortex', 'photon', 'galaxis'];
    const triggerMeteorEvent = async (chanId) => {
        const keyword = METEOR_KEYWORDS[Math.floor(Math.random() * METEOR_KEYWORDS.length)];
        const reward = Math.floor(Math.random() * 101) + 50; // 50–150
        const { data } = await supabase.rpc('start_bot_event', { p_type: 'meteor', p_data: { keyword, reward }, p_duration: 8 });
        if (!data?.success) return;
        activeEventsRef.current.meteor = { id: data.id, data: { keyword, reward } };
        await chatService.sendBotMessage(
            `<div class="bot-card bot-card-event">\n<div class="bot-card-label">☄️ LLUVIA DE METEORITOS</div>\n<div class="bot-card-answer bot-answer-yes bot-text-xl bot-text-center"><strong>+${reward} ◈</strong> para el primero</div>\n<div class="bot-card-footer">¡Escribe la palabra clave <strong>"${keyword}"</strong> antes que nadie! (8 min)</div>\n</div>`,
            chanId
        );
    };

    // ── Trigger de Jefe Cósmico ───────────────────────────────────
    const BOSS_NAMES = ['Nebulón el Devorador', 'Xarath el Oscuro', 'Voidus el Sin-Fin', 'Kronax el Eterno', 'Stellarex el Caótico'];
    const triggerBossEvent = async (chanId) => {
        const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
        const maxHp = Math.floor(Math.random() * 301) + 200; // 200–500
        const reward = Math.floor(Math.random() * 401) + 200; // 200–600 total
        const { data } = await supabase.rpc('start_bot_event', { p_type: 'boss', p_data: { boss_name: bossName, hp: maxHp, max_hp: maxHp, reward, attackers: {} }, p_duration: 20 });
        if (!data?.success) return;
        activeEventsRef.current.boss = { id: data.id };
        const hpBar = '█'.repeat(20);
        await chatService.sendBotMessage(
            `<div class="bot-card bot-card-event">\n<div class="bot-card-label">👾 ¡JEFE CÓSMICO APARECE!</div>\n<div class="bot-card-answer bot-answer-no bot-text-center"><strong>${bossName}</strong></div>\n<div class="bot-progress">[${hpBar}] ${maxHp}/${maxHp} HP</div>\n<div class="bot-card-footer">Usa <strong>/attack</strong> para combatir · Recompensa total: ${reward} ◈</div>\n</div>`,
            chanId
        );
    };

    // ── Trigger de Evento de Mercado ──────────────────────────────
    const triggerMarketEvent = async (chanId) => {
        const isBoom = Math.random() > 0.5;
        const multiplier = isBoom ? 2 : 0.5;
        const { data } = await supabase.rpc('start_bot_event', { p_type: 'market_crash', p_data: { multiplier, is_boom: isBoom }, p_duration: 30 });
        if (!data?.success) return;
        activeEventsRef.current.marketCrash = { id: data.id, data: { multiplier, is_boom: isBoom } };
        const icon = isBoom ? '📈' : '📉';
        const color = isBoom ? 'bot-answer-yes' : 'bot-answer-no';
        const text = isBoom
            ? '¡BOOM ESTELAR! Las misiones /work dan ×2 durante 30 minutos.'
            : '¡CRASH GALÁCTICO! Las misiones /work dan la mitad durante 30 minutos.';
        await chatService.sendBotMessage(
            `<div class="bot-card bot-card-event">\n<div class="bot-card-label">${icon} Evento Económico Galáctico</div>\n<div class="bot-card-answer ${color} bot-text-xl bot-text-center"><strong>×${multiplier}</strong> en /work</div>\n<div class="bot-card-footer">${text}</div>\n</div>`,
            chanId
        );
    };

    // ── Trigger de Eclipse Galáctico ──────────────────────────────
    const triggerEclipseEvent = async (chanId) => {
        const { data } = await supabase.rpc('start_bot_event', { p_type: 'eclipse', p_data: { multiplier: 1.5 }, p_duration: 120 });
        if (!data?.success) return;
        activeEventsRef.current.eclipse = { id: data.id, expires_at: data.expires_at, data: { multiplier: 1.5 } };
        await chatService.sendBotMessage(
            `<div class="bot-card bot-card-event">\n<div class="bot-card-label">🌑 ECLIPSE GALÁCTICO</div>\n<div class="bot-card-answer bot-answer-yes bot-text-xl bot-text-center"><strong>×1.5 XP</strong> + <strong>+5 ◈</strong> por mensaje</div>\n<div class="bot-card-footer">El Eclipse dura 2 horas. ¡Chatea y gana más que nunca! 🌌</div>\n</div>`,
            chanId
        );
    };

    // ── Revisor periódico: decide si lanzar un evento aleatorio ──
    const maybeStartAutoEvent = async () => {
        const now = Date.now();
        if (now - lastEventRollRef.current < 10 * 60 * 1000) return;
        lastEventRollRef.current = now;
        const chanId = activeChannel === 'comandos' || activeChannel === 'global' ? 'global' : null;
        if (!chanId) return;
        const roll = Math.random();
        if (roll < 0.30) await triggerMeteorEvent(chanId);
        else if (roll < 0.50) await triggerBossEvent(chanId);
        else if (roll < 0.60) await triggerMarketEvent(chanId);
        else if (roll < 0.65) await triggerEclipseEvent(chanId);
    };

    const handleBotCommand = useCallback(async (content) => {
        const parts = content.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const senderName = userProfile?.username || user?.user_metadata?.username || 'Viajero';
        const getHandValue = (hand) => {
            let val = 0; let aces = 0;
            for (const c of hand) {
                if (!c || typeof c !== 'string') continue;
                const s = c.substring(0, c.length - 1);
                if (s === 'A') { aces++; val += 11; }
                else if (['J', 'Q', 'K'].includes(s)) val += 10;
                else val += parseInt(s);
            }
            while (val > 21 && aces > 0) { val -= 10; aces--; }
            return val;
        };

        const renderHand = (hand) => hand.map(c => `[${c}]`).join(' ');

        let response = '';

        switch (cmd) {
            case '/voice':
                const room = args.join(' ');
                if (!room) {
                    response = '🔊 Uso: `/voice <nombre_de_sala>`.';
                } else {
                    handleCreateVoiceRoom(room);
                    response = `📡 **Canal temporal creado:** \`${room}\`. ¡Todos invitados!`;
                }
                break;

            case '/help':
                if (args[0] === 'economy') {
                    response = '💰 **Gestión Financiera Galáctica:**\n\n' +
                        '- `/bal`: Tu balance.\n' +
                        '- `/daily`: Bono 24h.\n' +
                        '- `/work`: Misión (4h).\n' +
                        '- `/bet <monto>`: 50/50.\n' +
                        '- `/slots <monto>`: Tragamonedas.\n' +
                        '- `/rob @user`: Robar.\n' +
                        '- `/give @user <m>`: Enviar.\n' +
                        '- `/lb`: Top Ricos.';
                } else if (args[0] === 'social') {
                    response = '🎭 **Interacción Estelar:**\n\n' +
                        '- `/profile @user`: Info.\n' +
                        '- `/mood <text>`: Estado.\n' +
                        '- `/ship @u1 @u2`: Amor.\n' +
                        '- `/marry @user`: Boda.\n' +
                        '- `/avatar @user`: Foto.\n' +
                        '- `/hug`, `/kiss`, `/slap`, `/dance`.';
                } else if (args[0] === 'admin' && userProfile?.is_admin) {
                    response = '🛡️ **Protocolos de Élite:**\n\n' +
                        '- `/clear`: Purgar canal.\n' +
                        '- `/tax @user <m>`: Multar.\n' +
                        '- `/announce <msg>`: Comunicado.';
                } else {
                    response = '🤖 **Protocolos HyperBot:**\n\n' +
                        '💰 `/help economy`: Dinero y Juegos.\n' +
                        '🎭 `/help social`: Perfil y Amigos.\n' +
                        '⚡ `/rank`: Tu nivel y XP.\n' +
                        '🏆 `/top-level`: Ranking por nivel.\n' +
                        '🔥 `/streak`: Tu racha diaria.\n' +
                        '🎖️ `/achievements`: Tus logros.\n' +
                        '👾 `/attack`: Atacar al jefe (en eventos).\n' +
                        '🔊 `/voice <sala>`: Crear sala de voz.\n' +
                        '✨ `/joke`, `/quote`, `/pick`, `/roll`.';
                }
                break;

            case '/bal':
                response = `<div class="bot-card">\n<div class="bot-card-label">💰 Balance · @${senderName}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-xl bot-text-center"><strong>${balance.toLocaleString()}</strong></div>\n<div class="bot-card-footer">◈ Starlys disponibles</div>\n</div>`;
                break;

            case '/daily':
                try {
                    const result = await claimDaily();
                    if (result.success) response = `✨ **Bono de ${result.bonus} ◈** reclamado por @${senderName}. Total: **${result.balance} ◈**.`;
                    else response = `⏳ **Espera:** @${senderName}, ${result.message}`;
                } catch (err) { response = '❌ Error al reclamar.'; }
                break;

            case '/bet':
                const betAmt = parseInt(args[0]);
                const betLimit = userProfile?.stellar_pact_active ? 100 : 1000000;
                if (isNaN(betAmt) || betAmt < 10) {
                    response = '❌ Uso: `/bet 50`. (Mín. 10 ◈).';
                } else if (betAmt > betLimit) {
                    response = `⚠️ **Pacto Estelar Activo:** Tu límite de apuesta se ha reducido a **${betLimit} ◈**.`;
                } else if (betAmt > balance) {
                    response = `⚠️ Solo tienes **${balance} ◈**.`;
                } else {
                    const win = Math.random() > 0.55;
                    if (win) {
                        await awardCoins(betAmt, 'game_reward');
                        response = `🎰 **¡Ganaste!** @${senderName} apostó **${betAmt} ◈** y duplicó. 🚀`;
                    } else {
                        try {
                            await transfer(HYPERBOT.id, betAmt, 'Bet Loss');
                            response = `📉 **Perdiste:** @${senderName} entregó **${betAmt} ◈** a HyperBot.`;
                        } catch (err) { response = '❌ Error bancario.'; }
                    }
                }
                break;

            case '/blackjack':
                if (activeGames.current[user.id]) {
                    response = '⚠️ Ya tienes un juego activo. Usa `/hit` o `/stand`.';
                    break;
                }
                const bjBet = parseInt(args[0]);
                const bjLimit = userProfile?.stellar_pact_active ? 100 : 1000000;
                if (isNaN(bjBet) || bjBet < 10) {
                    response = '❌ Uso: `/blackjack <monto>`. (Mín. 10 ◈).';
                    break;
                }
                if (bjBet > bjLimit) {
                    response = `⚠️ **Pacto Estelar Activo:** Límite de apuesta en Blackjack reducido a **${bjLimit} ◈**.`;
                    break;
                }
                if (bjBet > balance) {
                    response = `⚠️ Fondos insuficientes (**${balance} ◈**).`;
                    break;
                }

                const suits = ['♠', '♥', '♦', '♣'];
                const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                const deck = [];
                for (let s of suits) for (let f of faces) deck.push(f + s);
                const shuffle = (d) => d.sort(() => Math.random() - 0.5);
                const gameDeck = shuffle(deck);

                const pHand = [gameDeck.pop(), gameDeck.pop()];
                const dHand = [gameDeck.pop(), gameDeck.pop()];

                const pVal = getHandValue(pHand);
                if (pVal === 21) {
                    const prize = Math.floor(bjBet * 1.5);
                    await awardCoins(prize, 'blackjack_win');
                    response = `🃏 **BLACKJACK NATURAL!** 🃏\n@${senderName} sacó **${renderHand(pHand)}** (**21**).\n💰 Ganaste **${prize} ◈**!`;
                } else {
                    activeGames.current[user.id] = { type: 'blackjack', bet: bjBet, player: pHand, dealer: dHand, deck: gameDeck };
                    response = `🃏 **BLACKJACK: Arena de @${senderName}** 🃏\n\n` +
                        `Tu mano: **${renderHand(pHand)}** (${pVal})\n` +
                        `Dealer: **[ ? ] [${dHand[1]}]**\n\n` +
                        `👉 Escribe \`/hit\` para otra carta o \`/stand\` para plantarte.`;
                }
                break;

            case '/hit':
                const gameHit = activeGames.current[user.id];
                if (!gameHit || gameHit.type !== 'blackjack') {
                    response = '❌ No tienes un juego de Blackjack activo.';
                } else {
                    const deckH = gameHit.deck;
                    gameHit.player.push(deckH.pop());
                    const newVal = getHandValue(gameHit.player);
                    if (newVal > 21) {
                        delete activeGames.current[user.id];
                        await transfer(HYPERBOT.id, gameHit.bet, 'Blackjack Loss');
                        response = `💥 **¡BUST!** @${senderName} se pasó de 21.\n` +
                            `Tu mano: **${renderHand(gameHit.player)}** (**${newVal}**)\n` +
                            `💸 Perdiste **${gameHit.bet} ◈**.`;
                    } else if (newVal === 21) {
                        response = `🔥 **¡21!** @${senderName}, tus cartas: **${renderHand(gameHit.player)}**.\nTe sugiero \`/stand\` ahora.`;
                    } else {
                        response = `🃏 **Hit de @${senderName}:**\n` +
                            `Tus cartas: **${renderHand(gameHit.player)}** (**${newVal}**)\n` +
                            `¿Otra? \`/hit\` o \`/stand\`.`;
                    }
                }
                break;

            case '/stand':
                const gameS = activeGames.current[user.id];
                if (!gameS || gameS.type !== 'blackjack') {
                    response = '❌ No tienes juego activo.';
                } else {
                    delete activeGames.current[user.id];
                    let dH = gameS.dealer;
                    let dV = getHandValue(dH);
                    while (dV < 17) {
                        dH.push(gameS.deck.pop());
                        dV = getHandValue(dH);
                    }
                    const pV = getHandValue(gameS.player);
                    response = `🃏 **RESULTADO BLACKJACK** 🃏\n\n` +
                        `Tú: **${renderHand(gameS.player)}** (${pV})\n` +
                        `Dealer: **${renderHand(dH)}** (${dV})\n\n`;

                    if (dV > 21 || pV > dV) {
                        await awardCoins(gameS.bet, 'blackjack_win');
                        response += `🎉 **¡GANASTE!** HyperBot ha sido derrotado.\n💰 Ganaste **${gameS.bet} ◈**.`;
                    } else if (dV > pV) {
                        await transfer(HYPERBOT.id, gameS.bet, 'blackjack_loss');
                        response += `💀 **PERDISTE.** HyperBot gana esta ronda.\n💸 Perdiste **${gameS.bet} ◈**.`;
                    } else {
                        response += `🤝 **EMPATE.** Las monedas regresan a tu cuenta.`;
                    }
                }
                break;

            case '/duel':
                const duelAmt = parseInt(args[1]);
                if (!args[0] || isNaN(duelAmt) || duelAmt < 10) {
                    response = '❌ `/duel @usuario <monto>`.';
                } else if (duelAmt > balance) {
                    response = '⚠️ Fondos insuficientes.';
                } else {
                    const targetUsername = args[0].replace('@', '');
                    if (targetUsername === senderName) {
                        response = '❌ No puedes pelear contigo mismo.';
                    } else {
                        let targetId = Object.keys(onlineUsers).find(id => onlineUsers[id].username === targetUsername);
                        if (!targetId) {
                            const { data: p } = await supabase.from('profiles').select('id').eq('username', targetUsername).single();
                            if (p) targetId = p.id;
                        }
                        if (!targetId) response = `❌ **${targetUsername}** no está en línea.`;
                        else {
                            pendingDuel.current = { challengerId: user.id, challengerName: senderName, targetId, targetName: targetUsername, amount: duelAmt, expiry: Date.now() + 60000 };
                            response = `⚔️ **¡DUELO!** @${senderName} retó a **@${targetUsername}** por **${duelAmt} ◈**. Escribe \`/accept\`.`;
                        }
                    }
                }
                break;

            case '/accept':
                if (!pendingDuel.current || pendingDuel.current.expiry < Date.now()) response = '❌ No hay duelos.';
                else if (pendingDuel.current.targetId !== user.id) response = '❌ Este duelo no es para ti.';
                else if (balance < pendingDuel.current.amount) response = '⚠️ Fondos insuficientes.';
                else {
                    const { challengerId, challengerName, targetName, amount } = pendingDuel.current;
                    pendingDuel.current = null;
                    const win = Math.random() > 0.5;
                    const winnerId = win ? user.id : challengerId;
                    const winnerName = win ? targetName : challengerName;
                    const loserName = win ? challengerName : targetName;
                    try {
                        if (win) await awardCoins(amount, 'game_reward', winnerId);
                        else await transfer(challengerId, amount, 'Duel Loss');
                        response = `🏟️ **${winnerName}** derrotó a **${loserName}** y ganó **${amount} ◈**!`;
                    } catch (err) { response = '❌ Error de combate.'; }
                }
                break;

            case '/hug':
            case '/kiss':
            case '/slap':
            case '/punch':
            case '/bite':
            case '/pat':
            case '/dance':
                const target = args[0] || 'al vacío';
                const socialActions = {
                    '/hug': [`🤗 **@${senderName}** envuelve a **${target}** en un abrazo estelar.`, `🤗 Un abrazo galáctico de **@${senderName}** llega a **${target}**. ✨`],
                    '/kiss': [`💋 **@${senderName}** besa a **${target}** bajo la luz de las estrellas.`, `💋 **${target}** recibe un beso de **@${senderName}**. 🌙`],
                    '/slap': [`👋 **@${senderName}** abofetea a **${target}** con la fuerza de un pulsar.`, `💥 ¡**${target}** recibió una bofetada de **@${senderName}**!`],
                    '/punch': [`👊 **@${senderName}** golpea a **${target}** con energía de quásar.`, `💥 **${target}** fue golpeado por **@${senderName}**. ¡Au!`],
                    '/bite': [`😬 **@${senderName}** muerde a **${target}**. ¡Cuidado con los dientes cósmicos!`, `🦷 **${target}** fue mordido por **@${senderName}**. 🌌`],
                    '/pat': [`🫶 **@${senderName}** acaricia a **${target}** con ternura galáctica.`, `✨ Qué bonito gesto de **@${senderName}** hacia **${target}**.`],
                    '/dance': [`💃 **@${senderName}** baila con **${target}** al ritmo del universo. 🎶`, `🕺 **@${senderName}** y **${target}** se mueven al compás estelar. ✨`],
                };
                const pool = socialActions[cmd] || [`✨ **@${senderName}** hace algo con **${target}**.`];
                response = pool[Math.floor(Math.random() * pool.length)];
                break;

            case '/slots':
                const slotsAmt = parseInt(args[0]);
                const slotsLimit = userProfile?.stellar_pact_active ? 50 : 1000000;
                if (isNaN(slotsAmt) || slotsAmt < 10) {
                    response = '🎰 Uso: `/slots 50`. (Mín. 10 ◈).';
                } else if (slotsAmt > slotsLimit) {
                    response = `⚠️ **Pacto Estelar Activo:** Límite en Tragamonedas reducido a **${slotsLimit} ◈**.`;
                } else if (slotsAmt > balance) {
                    response = `⚠️ Fondos insuficientes (**${balance} ◈**).`;
                } else {
                    const symbols = ['🚀', '🌌', '⭐', '💎', '👾'];
                    const r1 = symbols[Math.floor(Math.random() * symbols.length)];
                    const r2 = symbols[Math.floor(Math.random() * symbols.length)];
                    const r3 = symbols[Math.floor(Math.random() * symbols.length)];
                    const isWin = r1 === r2 && r2 === r3;
                    const isPartial = !isWin && (r1 === r2 || r2 === r3 || r1 === r3);
                    let resultHtml, colorClass;
                    if (isWin) {
                        const jackpot = slotsAmt * 10;
                        await awardCoins(jackpot, 'game_reward');
                        resultHtml = `💎 <strong>¡JACKPOT!</strong> +${jackpot} ◈`;
                        colorClass = 'bot-answer-yes';
                    } else if (isPartial) {
                        const smallWin = Math.floor(slotsAmt * 1.5);
                        await awardCoins(smallWin - slotsAmt, 'game_reward');
                        resultHtml = `⚡ <strong>¡Casi!</strong> Recuperaste ${smallWin} ◈`;
                        colorClass = 'bot-answer-maybe';
                    } else {
                        await economyService.deductCoins(user.id, slotsAmt, 'game_loss', 'Perdió en tragamonedas');
                        resultHtml = `💸 Mala suerte. Perdiste <strong>${slotsAmt} ◈</strong>`;
                        colorClass = 'bot-answer-no';
                    }
                    const wc = isWin ? 'bot-slot-win' : '';
                    response = `<div class="bot-card">\n<div class="bot-card-label">🎰 Máquina Estelar · @${senderName}</div>\n<div class="bot-slots-display"><div class="bot-slot-cell ${wc}">${r1}</div><div class="bot-slot-cell ${wc}">${r2}</div><div class="bot-slot-cell ${wc}">${r3}</div></div>\n<div class="bot-card-answer ${colorClass}">${resultHtml}</div>\n</div>`;
                }
                break;

            case '/give':
                const giveTarget = args[0]?.replace('@', '');
                const giveAmt = parseInt(args[1]);
                if (!giveTarget || isNaN(giveAmt) || giveAmt < 1) {
                    response = '📦 Uso: `/give @usuario 100`.';
                } else {
                    try {
                        const targetProfile = await chatService.getProfileByUsername(giveTarget);
                        if (!targetProfile) response = `❌ Usuario **@${giveTarget}** no detectado en el radar.`;
                        else {
                            await transfer(targetProfile.id, giveAmt, `Regalo de ${senderName}`);
                            response = `📦 **Transferencia estelar:** @${senderName} envió **${giveAmt} ◈** a @${giveTarget}.`;
                        }
                    } catch (e) { response = '❌ Error en la red bancaria.'; }
                }
                break;

            case '/lb':
            case '/leaderboard':
                try {
                    const isChat = args[0] === 'chat' || args[0] === 'msgs';
                    const top = isChat
                        ? await chatService.getChatLeaderboard(10)
                        : await economyService.getLeaderboard(10);

                    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                    const rankClasses = ['bot-lb-first', 'bot-lb-second', 'bot-lb-third', '', '', '', '', '', '', ''];

                    const entries = top.map((u, i) => {
                        const score = isChat
                            ? `<div class="bot-lb-coins">Lv.${u.chat_level} · ${u.message_count} 💬</div>`
                            : `<div class="bot-lb-coins">${u.balance.toLocaleString()} ◈</div>`;

                        return `<div class="bot-lb-entry ${rankClasses[i] || ''}">
                            <div class="bot-lb-rank">${medals[i] || (i + 1)}</div>
                            <div class="bot-lb-name">@${u.username}</div>
                            ${score}
                        </div>`;
                    }).join('\n');

                    response = `<div class="bot-card">
                        <div class="bot-card-label">${isChat ? '🏆 Top Charlatanes Estelares' : '🏆 Top Viajeros Galácticos'}</div>
                        <div class="bot-lb-container">${entries}</div>
                        <div class="bot-card-footer">${isChat ? 'Usa /lb para ver el ranking de Starlys' : 'Usa /lb chat para ver el ranking de mensajes'}</div>
                    </div>`;
                } catch (e) {
                    console.error(e);
                    response = '❌ Error al consultar el registro estelar.';
                }
                break;

            case '/work':
                try {
                    const result = await economyService.workMission(user.id);
                    if (result.success) {
                        let finalReward = result.reward;
                        let bonusTag = '';
                        // Aplicar multiplicador de evento de mercado
                        const { data: mktEvent } = await supabase
                            .from('bot_events')
                            .select('data')
                            .eq('type', 'market_crash')
                            .eq('status', 'active')
                            .gt('expires_at', new Date().toISOString())
                            .maybeSingle();
                        if (mktEvent) {
                            const mult = mktEvent.data.multiplier;
                            const extra = Math.round(result.reward * (mult - 1));
                            if (extra > 0) {
                                await awardCoins(extra, 'work_bonus');
                                finalReward += extra;
                                bonusTag = `\n<div class="bot-card-footer" style="color:#4ade80">⚡ Bonus Mercado ×${mult}: +${extra} ◈ extra</div>`;
                            } else if (extra < 0) {
                                // crash: descontar la diferencia (el trabajo ya premió el monto base)
                                try { await economyService.deductCoins(user.id, Math.abs(extra), 'market_crash', 'Penalización por crash de mercado'); } catch (_) { }
                                finalReward += extra;
                                bonusTag = `\n<div class="bot-card-footer" style="color:#f87171">📉 Penalización Crash ×${mult}: ${extra} ◈</div>`;
                            }
                        }
                        response = `<div class="bot-card">\n<div class="bot-card-label">🚀 Misión Completada · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>+${finalReward} ◈</strong></div>${bonusTag}\n</div>`;
                    } else {
                        const mins = Math.ceil((new Date(result.next_available) - new Date()) / 60000);
                        response = `<div class="bot-card">\n<div class="bot-card-label">⏳ Fatiga Espacial · @${senderName}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-center"><strong>${mins} min</strong></div>\n<div class="bot-card-footer">Descansa y vuelve más tarde</div>\n</div>`;
                    }
                } catch (e) { response = '❌ Fallo en los motores.'; }
                break;

            case '/rob':
                const robTarget = args[0]?.replace('@', '');
                if (!robTarget) response = '🕵️ Uso: `/rob @usuario`.';
                else {
                    try {
                        const { data: rData } = await supabase.rpc('rob_with_insurance', { p_from_user_id: user.id, p_target_username: robTarget });
                        if (rData?.success) {
                            if (rData.insured) {
                                response = `<div class="bot-card">\n<div class="bot-card-label">🛡️ ¡Robo Bloqueado por Seguro!</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-center"><strong>+0 ◈</strong></div>\n<div class="bot-card-footer">@${robTarget} tenía seguro espacial activo. El robo fue cubierto. 🛡️</div>\n</div>`;
                            } else {
                                response = `<div class="bot-card">\n<div class="bot-card-label">🥷 Atraco Espacial</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>+${rData.amount} ◈</strong></div>\n<div class="bot-card-footer">@${senderName} le robó a @${robTarget} exitosamente 🌌</div>\n</div>`;
                            }
                        } else if (rData?.reason === 'caught') {
                            response = `<div class="bot-card">\n<div class="bot-card-label">🚨 ¡Capturado!</div>\n<div class="bot-card-answer bot-answer-no bot-text-center"><strong>-${rData.penalty} ◈</strong></div>\n<div class="bot-card-footer">@${senderName} fue atrapado intentando robar a @${robTarget}</div>\n</div>`;
                        } else if (rData?.reason === 'cooldown') {
                            response = '🕵️ El radar de la policía está activo. Espera un poco.';
                        } else {
                            response = '❌ No se pudo completar el robo.';
                        }
                    } catch (e) { response = `❌ Error: ${e.message || 'Intento fallido.'}`; }
                }
                break;

            case '/ship':
                if (args.length < 2) response = '💖 Uso: `/ship @u1 @u2`.';
                else {
                    const love = Math.floor(Math.random() * 101);
                    const bar = '▓'.repeat(Math.floor(love / 10)) + '░'.repeat(10 - Math.floor(love / 10));
                    let comment, shipColor;
                    if (love > 90) { comment = '¡Destinados a gobernar la galaxia juntos! 🔥'; shipColor = 'bot-answer-yes'; }
                    else if (love > 70) { comment = 'Hay mucha química estelar aquí. ✨'; shipColor = 'bot-answer-yes'; }
                    else if (love > 50) { comment = 'Podría funcionar con un poco de combustible. 🚀'; shipColor = 'bot-answer-maybe'; }
                    else if (love > 30) { comment = 'Las señales son débiles... 💫'; shipColor = 'bot-answer-maybe'; }
                    else { comment = 'Una pareja imposible... 🌌'; shipColor = 'bot-answer-no'; }
                    response = `<div class="bot-card">\n<div class="bot-card-label">💖 Detector de Compatibilidad Galáctica</div>\n<div class="bot-text-center" style="font-size:13px;color:rgba(255,255,255,0.7);padding:4px 0"><strong>${args[0]}</strong> + <strong>${args[1]}</strong></div>\n<div class="bot-card-answer ${shipColor} bot-text-xl bot-text-center"><strong>${love}%</strong></div>\n<div class="bot-progress">${bar}</div>\n<div class="bot-card-footer">${comment}</div>\n</div>`;
                }
                break;

            case '/marry':
                const marryTarget = args[0]?.replace('@', '');
                if (!marryTarget) response = '💍 Uso: `/marry @usuario`.';
                else response = `💍 **@${senderName}** se ha arrodillado ante **@${marryTarget}** con un anillo de diamantes lunares... ¡Que el universo sea testigo!`;
                break;

            case '/profile':
                const profTarget = args[0]?.replace('@', '');
                if (!profTarget) response = '👤 Uso: `/profile @usuario`.';
                else {
                    const p = await chatService.getProfileByUsername(profTarget);
                    if (!p) response = `❌ Perfil de **@${profTarget}** fuera de línea.`;
                    else response = `👤 **Perfil de @${p.username}:**\n💰 Balance: **${p.balance} ◈**\n🎭 Mood: *${p.mood || 'Explorando...'}*\n📅 Llegada: ${new Date(p.created_at).toLocaleDateString()}`;
                }
                break;

            case '/avatar':
                const avTarget = args[0]?.replace('@', '');
                if (!avTarget) response = '🖼️ Uso: `/avatar @usuario`.';
                else {
                    const p = await chatService.getProfileByUsername(avTarget);
                    if (!p) response = `❌ No se encontró el holograma de **@${avTarget}**.`;
                    else response = `🖼️ **Holograma de @${avTarget}:**\n${p.avatar_url}`;
                }
                break;

            case '/mood':
                const moodText = args.join(' ');
                if (!moodText) response = '💭 Uso: `/mood <estado>`.';
                else {
                    await economyService.updateMood(user.id, moodText);
                    response = `💭 **@${senderName}** ahora se siente: *${moodText}* ✨`;
                }
                break;

            case '/clear':
                if (!userProfile?.is_admin) response = '🚫 Solo los Administradores de Élite pueden hacer esto.';
                else {
                    await chatService.clearChannel(activeChannel);
                    response = '🧹 **PROTOCOLOS DE LIMPIEZA:** El canal ha sido purgado de registros antiguos.';
                }
                break;

            case '/tax':
                const taxTarget = args[0]?.replace('@', '');
                const taxAmt = parseInt(args[1]);
                if (!userProfile?.is_admin) response = '🚫 Permisos de administración requeridos.';
                else if (!taxTarget || isNaN(taxAmt)) response = '🛡️ Uso: `/tax @usuario 500`.';
                else {
                    const p = await chatService.getProfileByUsername(taxTarget);
                    if (!p) response = '❌ Usuario no encontrado.';
                    else {
                        await economyService.deductCoins(p.id, taxAmt, 'admin_deduct', `Impuesto aplicado por ${senderName}`);
                        response = `🛡️ **Impuesto Galáctico:** Se han deducido **${taxAmt} ◈** a @${taxTarget} por orden superior.`;
                    }
                }
                break;

            case '/announce':
                const annMsg = args.join(' ');
                if (!userProfile?.is_admin) response = '🚫 Solo la realeza galáctica puede anunciar.';
                else if (!annMsg) response = '📢 Uso: `/announce <mensaje>`.';
                else {
                    // Enviar a todos los canales (simulado por ahora enviando un bot message especial)
                    response = `🚨 **COMUNICADO OFICIAL:**\n\n${annMsg.toUpperCase()}\n\nPor orden de: @${senderName}`;
                }
                break;

            case '/joke': {
                const jokes = [
                    '¿Por qué los astronautas no pueden tener relaciones estables? Porque siempre necesitan su *espacio*. 🚀',
                    '¿Cuál es el plato favorito de un extraterrestre? ¡Los *avistamientos*! 🛸',
                    '¿Por qué el sol no fue a la escuela? Porque ya tenía *millones de grados*. ☀️',
                    '¿Cómo llamas a un cinturón de asteroides elegante? ¡El *cinturón* de Orión! 💫',
                    '¿Por qué Plutón no fue a la fiesta? Porque ya no lo consideran parte del *grupo*. 🥲',
                    '¿Qué le dijo la Tierra a la Luna? Para de girar a mi alrededor, ¡ya sé que estás ahí! 🌙',
                    '¿Qué hace una estrella cuando tiene frío? ¡Se pone una *nebulosa*! 🌌',
                    '¿Por qué los agujeros negros son tan populares? Porque tienen mucha *gravedad*. ⚫',
                ];
                response = jokes[Math.floor(Math.random() * jokes.length)];
                break;
            }
            case '/quote': {
                const quotes = [
                    '"El cosmos es todo lo que es, todo lo que fue y todo lo que será." — Carl Sagan',
                    '"Somos polvo de estrellas explorando el cosmos." — Neil deGrasse Tyson',
                    '"La Tierra es la cuna de la humanidad, pero no podemos vivir en la cuna para siempre." — Tsiolkovsky',
                    '"Alcanza la luna; incluso si fallas, aterrizarás entre las estrellas." — Norman Vincent Peale',
                    '"El espacio no es el límite, es el principio." — Desconocido',
                    '"Mirar las estrellas y no preguntarse es no vivir." — Anónimo',
                    '"Dos posibilidades: o estamos solos en el universo, o no lo estamos. Ambas son igualmente aterradoras." — Arthur C. Clarke',
                ];
                response = `> ${quotes[Math.floor(Math.random() * quotes.length)]}`;
                break;
            }
            case '/weather': {
                const weathers = [
                    { icon: '⚡', status: 'Tormenta Solar', detail: 'Interferencias en comunicaciones galácticas.' },
                    { icon: '🌌', status: 'Calma Interestelar', detail: 'Condiciones perfectas para explorar.' },
                    { icon: '☄️', status: 'Lluvia de Meteoritos', detail: 'Mantente dentro de tu nave.' },
                    { icon: '💫', status: 'Aurora Cósmica', detail: 'Espectáculo de colores en el horizonte.' },
                    { icon: '🌀', status: 'Viento Solar', detail: 'Corrientes de plasma detectadas.' },
                    { icon: '🌑', status: 'Eclipse Galáctico', detail: 'Oscuridad temporal. Nada que temer.' },
                ];
                const w = weathers[Math.floor(Math.random() * weathers.length)];
                response = `<div class="bot-card">\n<div class="bot-card-label">🛰️ Pronóstico Galáctico</div>\n<div class="bot-text-center bot-text-xl">${w.icon}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-center"><strong>${w.status}</strong></div>\n<div class="bot-card-footer">${w.detail}</div>\n</div>`;
                break;
            }
            case '/pick': {
                if (args.length < 2) { response = '🎯 Uso: `/pick opcion1 opcion2 ...`.'; break; }
                const chosen = args[Math.floor(Math.random() * args.length)];
                response = `<div class="bot-card">\n<div class="bot-card-label">🎯 Decisión de la IA Cósmica</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>${chosen}</strong></div>\n<div class="bot-card-footer">Entre: ${args.join(' · ')}</div>\n</div>`;
                break;
            }
            case '/roll': {
                const rolled = Math.floor(Math.random() * 100) + 1;
                const rollColor = rolled >= 80 ? 'bot-answer-yes' : rolled >= 40 ? 'bot-answer-maybe' : 'bot-answer-no';
                response = `<div class="bot-card">\n<div class="bot-card-label">🎲 Dado Cuántico · @${senderName}</div>\n<div class="bot-card-answer ${rollColor} bot-text-xl bot-text-center"><strong>${rolled}</strong></div>\n<div class="bot-card-footer">de 100</div>\n</div>`;
                break;
            }
            case '/flip': {
                const isCara = Math.random() > 0.5;
                response = `<div class="bot-card">\n<div class="bot-card-label">🪙 Moneda Cósmica · @${senderName}</div>\n<div class="bot-text-center bot-text-xl">${isCara ? '🌕' : '🌑'}</div>\n<div class="bot-card-answer ${isCara ? 'bot-answer-yes' : 'bot-answer-no'} bot-text-center"><strong>${isCara ? 'CARA' : 'CRUZ'}</strong></div>\n</div>`;
                break;
            }
            case '/8ball': {
                const question = args.join(' ');
                if (!question) { response = '🎱 Uso: `/8ball <tu pregunta>`.'; break; }
                const answers = [
                    { text: 'Así es, definitivamente.', type: 'yes' },
                    { text: 'El cosmos lo confirma.', type: 'yes' },
                    { text: 'Sin ninguna duda.', type: 'yes' },
                    { text: 'Las estrellas dicen que sí.', type: 'yes' },
                    { text: 'Todo apunta que sí.', type: 'yes' },
                    { text: 'Muy probable.', type: 'yes' },
                    { text: 'Señales favorables detectadas.', type: 'yes' },
                    { text: 'La nebulosa nubla mi visión.', type: 'maybe' },
                    { text: 'Incierto... vuelve a preguntar.', type: 'maybe' },
                    { text: 'Las señales son confusas.', type: 'maybe' },
                    { text: 'Concéntrate y pregunta de nuevo.', type: 'maybe' },
                    { text: 'El universo guarda silencio.', type: 'maybe' },
                    { text: 'No cuentes con ello.', type: 'no' },
                    { text: 'Mis sensores dicen que no.', type: 'no' },
                    { text: 'Perspectivas poco favorables.', type: 'no' },
                    { text: 'El universo dice que no.', type: 'no' },
                    { text: 'Los astros están en contra.', type: 'no' },
                    { text: 'Definitivamente no.', type: 'no' },
                    { text: 'Muy poco probable.', type: 'no' },
                    { text: 'Ni lo intentes.', type: 'no' },
                ];
                const pick = answers[Math.floor(Math.random() * answers.length)];
                const ballColor = pick.type === 'yes' ? 'bot-answer-yes' : pick.type === 'no' ? 'bot-answer-no' : 'bot-answer-maybe';
                const ballIcon = pick.type === 'yes' ? '✅' : pick.type === 'no' ? '❌' : '🌀';
                response = `<div class="bot-card">\n<div class="bot-card-label">🎱 La Bola Cósmica Responde</div>\n<div class="bot-card-question">"${question}"</div>\n<div class="bot-card-answer ${ballColor}">${ballIcon} <strong>${pick.text}</strong></div>\n</div>`;
                break;
            }
            case '/confession': {
                const confText = args.join(' ');
                if (!confText) { response = '🤫 Uso: `/confession <tu secreto>`.'; break; }
                response = `<div class="bot-card bot-card-confession">\n<div class="bot-card-label">🤫 Confesión Anónima del Espacio</div>\n<div class="bot-confession-text">"${confText}"</div>\n<div class="bot-card-footer">— Un viajero que prefiere el anonimato</div>\n</div>`;
                break;
            }
            case '/poll': {
                const fullText = args.join(' ');
                const pollMatch = fullText.match(/"([^"]+)"\s+(.+)/);
                if (!pollMatch) { response = '📊 Uso: `/poll "pregunta" opcion1 opcion2`.'; break; }
                const pollQ = pollMatch[1];
                const pollOpts = pollMatch[2].trim().split(/\s+/).slice(0, 4);
                if (pollOpts.length < 2) { response = '📊 Necesitas al menos 2 opciones.'; break; }
                const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
                const optHtml = pollOpts.map((o, i) => `<div class="bot-poll-option">${nums[i]} <strong>${o}</strong></div>`).join('\n');
                response = `<div class="bot-card bot-card-poll">\n<div class="bot-card-label">📊 Encuesta Estelar</div>\n<div class="bot-poll-question"><strong>${pollQ}</strong></div>\n${optHtml}\n<div class="bot-card-footer">Responde con el número de tu elección</div>\n</div>`;
                break;
            }
            // ── /rank ─────────────────────────────────────────────────
            case '/rank': {
                const { data: p } = await supabase
                    .from('profiles')
                    .select('activity_xp, activity_level, level, xp, chat_level, message_count, prestige_level, chat_title, xp_boost_until')
                    .eq('id', user.id)
                    .single();
                if (!p) { response = '❌ No se pudo cargar tu perfil.'; break; }

                const lvl = p.activity_level || 1;
                const xp = p.activity_xp || 0;
                const xpCurr = Math.pow(lvl - 1, 2) * 10;
                const xpNext = Math.pow(lvl, 2) * 10;
                const xpIn = xp - xpCurr;
                const xpNeeded = xpNext - xpCurr;
                const filled = Math.min(20, Math.floor((xpIn / xpNeeded) * 20));
                const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
                const pct = Math.min(100, Math.floor((xpIn / xpNeeded) * 100));

                const prestige = p.prestige_level || 0;
                const prestigeBadge = prestige > 0 ? ' ' + '✦'.repeat(Math.min(prestige, 5)) : '';
                const titleTag = p.chat_title ? `\n<div class="bot-card-footer" style="color:#a78bfa">🏷️ Título: <strong>${p.chat_title}</strong></div>` : '';
                const boostActive = p.xp_boost_until && new Date(p.xp_boost_until) > new Date();
                const boostTag = boostActive ? `\n<div class="bot-card-footer" style="color:#facc15">⚡ XP Boost ×2 activo hasta ${new Date(p.xp_boost_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : '';

                response = `<div class="bot-card">\n<div class="bot-card-label">⚡ Rango Estelar · @${senderName}${prestigeBadge}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-xl bot-text-center"><strong>Nivel ${lvl}</strong>${prestige > 0 ? ` <span style="color:#f59e0b;font-size:0.7em">Prestige ${prestige}</span>` : ''}</div>\n<div class="bot-progress-text">[${bar}] ${pct}%</div>\n<div class="bot-card-footer">${xp} XP · Chat Lv.${p.chat_level || 1} · ${p.message_count || 0} msgs · Estelar: ${p.level || 1}</div>${titleTag}${boostTag}\n</div>`;
                break;
            }

            // ── /top-level ────────────────────────────────────────────
            case '/top-level': {
                const { data: top } = await supabase
                    .from('profiles')
                    .select('username, activity_level, activity_xp')
                    .gt('activity_level', 0)
                    .order('activity_level', { ascending: false })
                    .order('activity_xp', { ascending: false })
                    .limit(10);
                if (!top?.length) { response = '📭 Todavía no hay viajeros con nivel registrado.'; break; }

                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                const rankCls = ['bot-lb-first', 'bot-lb-second', 'bot-lb-third', '', '', '', '', '', '', ''];
                const entries = top.map((u, i) =>
                    `<div class="bot-lb-entry ${rankCls[i] || ''}">\n<div class="bot-lb-rank">${medals[i]}</div>\n<div class="bot-lb-name">@${u.username}</div>\n<div class="bot-lb-coins">Lv.${u.activity_level} · ${u.activity_xp} XP</div>\n</div>`
                ).join('\n');
                response = `<div class="bot-card">\n<div class="bot-card-label">⚡ Top Viajeros por Nivel de Actividad</div>\n<div class="bot-lb-container">${entries}</div>\n<div class="bot-card-footer">Gana XP chateando y participando en la comunidad</div>\n</div>`;
                break;
            }

            // ── /streak ───────────────────────────────────────────────
            case '/streak': {
                const { data: p } = await supabase
                    .from('profiles')
                    .select('streak, best_streak, last_active_date')
                    .eq('id', user.id)
                    .single();
                if (!p) { response = '❌ No se pudo cargar tu racha.'; break; }

                const streak = p.streak || 0;
                const best = p.best_streak || 0;
                const streakFire = streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : streak >= 3 ? '🔥' : '💫';
                const color = streak >= 7 ? 'bot-answer-yes' : streak >= 3 ? 'bot-answer-maybe' : 'bot-answer-no';

                response = `<div class="bot-card">\n<div class="bot-card-label">🔥 Racha Estelar · @${senderName}</div>\n<div class="bot-card-answer ${color} bot-text-xl bot-text-center">${streakFire} <strong>${streak} día${streak !== 1 ? 's' : ''}</strong></div>\n<div class="bot-card-footer">Mejor racha: ${best} días · Usa /daily para mantenerla</div>\n</div>`;
                break;
            }

            // ── /achievements ─────────────────────────────────────────
            case '/achievements': {
                const { data: unlocked } = await supabase
                    .from('user_achievements')
                    .select('unlocked_at, achievement:achievements(icon, title, description)')
                    .eq('user_id', user.id)
                    .order('unlocked_at', { ascending: false });

                if (!unlocked?.length) {
                    response = `<div class="bot-card">\n<div class="bot-card-label">🎖️ Logros de @${senderName}</div>\n<div class="bot-card-answer bot-answer-no bot-text-center">Ningún logro aún</div>\n<div class="bot-card-footer">¡Explora la plataforma para desbloquear logros!</div>\n</div>`;
                    break;
                }

                const list = unlocked.slice(0, 5).map(u =>
                    `<div class="bot-lb-entry"><div class="bot-lb-rank">${u.achievement?.icon || '🎖️'}</div><div class="bot-lb-name">${u.achievement?.title || '?'}</div></div>`
                ).join('\n');
                const extra = unlocked.length > 5 ? `\n<div class="bot-card-footer">+${unlocked.length - 5} más · Total: ${unlocked.length} logros</div>` : `\n<div class="bot-card-footer">Total: ${unlocked.length} logro${unlocked.length !== 1 ? 's' : ''}</div>`;
                response = `<div class="bot-card">\n<div class="bot-card-label">🎖️ Logros de @${senderName}</div>\n<div class="bot-lb-container">${list}</div>${extra}\n</div>`;
                break;
            }

            // ── /attack ───────────────────────────────────────────────
            case '/attack': {
                const { data: bossEvent } = await supabase
                    .from('bot_events')
                    .select('*')
                    .eq('type', 'boss')
                    .eq('status', 'active')
                    .gt('expires_at', new Date().toISOString())
                    .maybeSingle();

                if (!bossEvent) { response = '👾 No hay ningún jefe activo ahora. ¡Espera al próximo evento!'; break; }

                const damage = Math.floor(Math.random() * 41) + 10; // 10–50
                const { data: result } = await supabase.rpc('attack_boss_event', {
                    p_event_id: bossEvent.id,
                    p_user_id: user.id,
                    p_username: senderName,
                    p_damage: damage
                });

                if (!result?.success) {
                    response = result?.reason === 'boss_dead' ? '☠️ El jefe ya fue derrotado.' : '❌ Error en el combate.';
                    break;
                }

                const bossName = bossEvent.data.boss_name;
                const hpFilled = Math.max(0, Math.floor((result.new_hp / result.max_hp) * 20));
                const hpBar = '█'.repeat(hpFilled) + '░'.repeat(20 - hpFilled);

                if (result.defeated) {
                    // Distribuir recompensas entre todos los atacantes
                    const attackerIds = Object.keys(result.attackers);
                    const rewardEach = Math.max(30, Math.floor(result.reward / Math.max(1, attackerIds.length)));
                    await Promise.allSettled(attackerIds.map(uid =>
                        supabase.rpc('award_coins', { p_user_id: uid, p_amount: rewardEach, p_type: 'boss_reward', p_reference: bossEvent.id, p_description: 'Recompensa por derrotar al jefe cósmico', p_metadata: {} })
                    ));
                    const heroList = Object.values(result.attackers).map(u => `@${u}`).join(', ');
                    response = `<div class="bot-card">\n<div class="bot-card-label">💀 ¡JEFE DERROTADO!</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>${bossName}</strong> ha caído</div>\n<div class="bot-card-footer">Héroes: ${heroList}<br>+${rewardEach} ◈ para cada uno 🎉</div>\n</div>`;
                } else {
                    const hpColor = result.new_hp > result.max_hp * 0.5 ? 'bot-answer-maybe' : 'bot-answer-no';
                    response = `<div class="bot-card">\n<div class="bot-card-label">⚔️ Ataque de @${senderName}</div>\n<div class="bot-card-answer ${hpColor} bot-text-center">−<strong>${damage} HP</strong> a ${bossName}</div>\n<div class="bot-progress">[${hpBar}] ${result.new_hp}/${result.max_hp}</div>\n<div class="bot-card-footer">¡Sigue atacando con /attack!</div>\n</div>`;
                }
                break;
            }

            // ── /seguro ───────────────────────────────────────────────
            case '/seguro': {
                const isBuy = args[0] === 'comprar' || args[0] === 'buy';
                if (isBuy) {
                    const { data: insResult } = await supabase.rpc('buy_insurance', { p_user_id: user.id });
                    if (!insResult?.success) {
                        if (insResult?.reason === 'already_active') {
                            const remaining = Math.ceil((new Date(insResult.expires_at) - new Date()) / 3600000);
                            response = `🛡️ Ya tienes seguro activo. Expira en **${remaining}h**.`;
                        } else if (insResult?.reason === 'insufficient_funds') {
                            response = `💸 Necesitas **${insResult.price} ◈** (tienes **${insResult.balance} ◈**).`;
                        } else response = '❌ Error al procesar el seguro.';
                        break;
                    }
                    const expTime = new Date(insResult.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    response = `<div class="bot-card">\n<div class="bot-card-label">🛡️ Seguro Espacial Activado · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>Protegido 24h</strong></div>\n<div class="bot-card-footer">Prima: ${insResult.price} ◈ · Válido hasta las ${expTime}<br>Si alguien te roba, el seguro cubre el 100% 🌌</div>\n</div>`;
                } else {
                    // Ver estado + precio
                    const [{ data: ins }, { data: priceData }] = await Promise.all([
                        supabase.from('user_insurance').select('expires_at, premium').eq('user_id', user.id).gt('expires_at', new Date().toISOString()).maybeSingle(),
                        supabase.rpc('get_item_price', { p_item_id: 'insurance' })
                    ]);
                    const currentPrice = priceData?.price || 100;
                    const todayPurchases = priceData?.purchases_today || 0;
                    if (ins) {
                        const remaining = Math.ceil((new Date(ins.expires_at) - new Date()) / 3600000);
                        response = `<div class="bot-card">\n<div class="bot-card-label">🛡️ Seguro Espacial · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center">✅ <strong>Activo</strong></div>\n<div class="bot-card-footer">Expira en ${remaining}h · Prima: ${ins.premium} ◈</div>\n</div>`;
                    } else {
                        const inflTag = todayPurchases > 0 ? `\n<div class="bot-card-footer" style="color:#f87171">📈 +${Math.round(Math.floor(todayPurchases / 5) * 15)}% inflación (${todayPurchases} compras hoy)</div>` : '';
                        response = `<div class="bot-card">\n<div class="bot-card-label">🛡️ Seguro Espacial · @${senderName}</div>\n<div class="bot-card-answer bot-answer-no bot-text-center">Sin cobertura</div>\n<div class="bot-card-footer">Precio: <strong>${currentPrice} ◈</strong> · Cobertura: 24h</div>${inflTag}\n<div class="bot-card-footer">Usa /seguro comprar para activarlo</div>\n</div>`;
                    }
                }
                break;
            }

            case '/renacer':
                if (args[0] === 'confirmar') {
                    const { data: res } = await supabase.rpc('prestige_user', { p_user_id: user.id });
                    if (res?.success) {
                        response = `<div class="bot-card">\n<div class="bot-card-label">✨ RENACIMIENTO COMPLETADO</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>Has renacido con éxito</strong></div>\n<div class="bot-card-footer">Tu nivel ha sido reiniciado a 1.\n\nRenacimientos totales: <strong>${res.prestige_level}</strong>\n\nBonus actuales:\n<strong>+${res.xp_bonus}% XP</strong>\n<strong>+${res.starlys_bonus}% Starlys</strong>\n\nTu viaje estelar comienza nuevamente.</div>\n</div>`;
                    } else {
                        if (res?.reason === 'level_too_low') {
                            response = `⚠️ **Nivel insuficiente:** Necesitas ser nivel 50 para renacer (Nivel actual: ${res.current_level || 'N/A'}).`;
                        } else {
                            response = '❌ Error al procesar el renacimiento.';
                        }
                    }
                } else {
                    response = `<div class="bot-card">\n<div class="bot-card-label">✨ RENACIMIENTO STELAR (PRESTIGE)</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-center"><strong>¿Estás a punto de renacer?</strong></div>\n<div class="bot-card-footer">Tu nivel estelar se reiniciará a 1 y perderás tu progreso actual.\n\nA cambio obtendrás bonus permanentes de experiencia y starlys.\n\n¿Deseas continuar?\n\nEscribe <strong>/renacer confirmar</strong> para realizar el sacrificio estelar.</div>\n</div>`;
                }
                break;

            // ── /invertir ─────────────────────────────────────────────
            case '/invertir': {
                const invAmt = parseInt(args[0]);
                const invHours = parseInt(args[1]) || 24;
                if (!invAmt || isNaN(invAmt)) {
                    response = '💰 Uso: `/invertir <monto> <24|48>`. Ej: `/invertir 500 24`\nRendimiento variable entre -20% y +50%.';
                    break;
                }
                const { data: invResult } = await supabase.rpc('buy_investment', { p_user_id: user.id, p_amount: invAmt, p_hours: invHours });
                if (!invResult?.success) {
                    if (invResult?.reason === 'minimum_amount') response = `❌ Inversión mínima: **50 ◈**.`;
                    else if (invResult?.reason === 'insufficient_funds') response = `💸 Fondos insuficientes (tienes **${invResult.balance} ◈**).`;
                    else response = '❌ Error al procesar la inversión.';
                    break;
                }
                const matureDate = new Date(invResult.matures_at).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                response = `<div class="bot-card">\n<div class="bot-card-label">📈 Inversión Registrada · @${senderName}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-center"><strong>${invAmt} ◈</strong> invertidos</div>\n<div class="bot-card-footer">Madura el ${matureDate} · Resultado: entre -20% y +50%<br>Usa /portafolio para reclamar 🚀</div>\n</div>`;
                break;
            }

            // ── /portafolio ───────────────────────────────────────────
            case '/portafolio': {
                const { data: investments } = await supabase
                    .from('user_investments')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .order('created_at', { ascending: true });

                if (!investments?.length) {
                    response = `<div class="bot-card">\n<div class="bot-card-label">📈 Portafolio · @${senderName}</div>\n<div class="bot-card-answer bot-answer-no bot-text-center">Sin inversiones activas</div>\n<div class="bot-card-footer">Usa /invertir &lt;monto&gt; &lt;24|48&gt; para comenzar</div>\n</div>`;
                    break;
                }

                const now = new Date();
                let rows = '';
                let claimedAny = false;

                for (const inv of investments) {
                    if (new Date(inv.matures_at) <= now) {
                        const { data: claimed } = await supabase.rpc('claim_investment', { p_user_id: user.id, p_investment_id: inv.id });
                        if (claimed?.success) {
                            claimedAny = true;
                            const profit = claimed.profit;
                            const sign = profit >= 0 ? '+' : '';
                            const col = profit >= 0 ? '#4ade80' : '#f87171';
                            rows += `<div class="bot-lb-entry"><div class="bot-lb-rank">✅</div><div class="bot-lb-name">${inv.amount} ◈</div><div class="bot-lb-coins" style="color:${col}">${sign}${profit} ◈ (${claimed.rate >= 0 ? '+' : ''}${claimed.rate}%)</div></div>\n`;
                        }
                    } else {
                        const hoursLeft = Math.ceil((new Date(inv.matures_at) - now) / 3600000);
                        rows += `<div class="bot-lb-entry"><div class="bot-lb-rank">⏳</div><div class="bot-lb-name">${inv.amount} ◈</div><div class="bot-lb-coins">Madura en ${hoursLeft}h</div></div>\n`;
                    }
                }

                response = `<div class="bot-card">\n<div class="bot-card-label">📈 Portafolio · @${senderName}</div>\n<div class="bot-lb-container">${rows}</div>${claimedAny ? '\n<div class="bot-card-footer" style="color:#4ade80">✅ Inversiones maduras cobradas</div>' : ''}\n</div>`;
                break;
            }

            // ── /efecto ───────────────────────────────────────────────
            case '/efecto': {
                const EFFECTS = { fire: '🔥 Fuego', stars: '✨ Estrellas', glitch: '⚡ Glitch' };
                const effectArg = args[0]?.toLowerCase();

                if (!effectArg) {
                    const [{ data: prFire }, { data: prStars }, { data: prGlitch }] = await Promise.all([
                        supabase.rpc('get_item_price', { p_item_id: 'chat_fire' }),
                        supabase.rpc('get_item_price', { p_item_id: 'chat_stars' }),
                        supabase.rpc('get_item_price', { p_item_id: 'chat_glitch' })
                    ]);
                    response = `<div class="bot-card">\n<div class="bot-card-label">✨ Efectos de Chat · @${senderName}</div>\n<div class="bot-lb-container">\n<div class="bot-lb-entry"><div class="bot-lb-rank">🔥</div><div class="bot-lb-name">fire</div><div class="bot-lb-coins">${prFire?.price || 300} ◈</div></div>\n<div class="bot-lb-entry"><div class="bot-lb-rank">✨</div><div class="bot-lb-name">stars</div><div class="bot-lb-coins">${prStars?.price || 250} ◈</div></div>\n<div class="bot-lb-entry"><div class="bot-lb-rank">⚡</div><div class="bot-lb-name">glitch</div><div class="bot-lb-coins">${prGlitch?.price || 400} ◈</div></div>\n</div>\n<div class="bot-card-footer">Usa /efecto &lt;fire|stars|glitch&gt; para comprar</div>\n</div>`;
                    break;
                }

                if (!EFFECTS[effectArg]) { response = `❌ Efecto desconocido. Usa: fire, stars, glitch.`; break; }

                const { data: efResult } = await supabase.rpc('buy_chat_effect', { p_user_id: user.id, p_effect: effectArg });
                if (!efResult?.success) {
                    if (efResult?.reason === 'insufficient_funds') response = `💸 Necesitas **${efResult.price} ◈** (tienes **${efResult.balance} ◈**).`;
                    else response = '❌ Error al comprar el efecto.';
                    break;
                }
                response = `<div class="bot-card">\n<div class="bot-card-label">✨ Efecto Activado · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>${EFFECTS[effectArg]}</strong></div>\n<div class="bot-card-footer">-${efResult.price} ◈ · Tus mensajes ahora tienen efecto ${EFFECTS[effectArg]} 🌌</div>\n</div>`;
                break;
            }

            // ── /badge ────────────────────────────────────────────────
            case '/badge': {
                const colorArg = args[0];
                if (!colorArg) {
                    response = `🎨 Uso: \`/badge #ff6b6b\` — Cambia el color de tu badge. Cualquier color hex válido.\nEj: \`/badge #7c3aed\` (morado) · \`/badge #06b6d4\` (cian) · \`/badge #f59e0b\` (dorado)`;
                    break;
                }
                const { data: badgeResult } = await supabase.rpc('set_badge_color', { p_user_id: user.id, p_color: colorArg });
                if (!badgeResult?.success) {
                    response = `❌ Color inválido. Usa formato hex: \`#RRGGBB\`. Ej: \`/badge #ff6b6b\``;
                    break;
                }
                response = `<div class="bot-card">\n<div class="bot-card-label">🎨 Badge Actualizado · @${senderName}</div>\n<div class="bot-card-answer bot-text-center" style="background:${colorArg}20;border:2px solid ${colorArg}"><strong style="color:${colorArg}">${colorArg}</strong></div>\n<div class="bot-card-footer">Tu nuevo color de badge es ${colorArg} 🌌</div>\n</div>`;
                break;
            }

            // ── /prestige ─────────────────────────────────────────────
            case '/prestige': {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('activity_level, prestige_level')
                    .eq('id', user.id)
                    .single();
                if (!pData) { response = '❌ Error al cargar tu perfil.'; break; }

                if ((pData.activity_level || 1) < 10) {
                    response = `<div class="bot-card">\n<div class="bot-card-label">✦ Prestige · @${senderName}</div>\n<div class="bot-card-answer bot-answer-no bot-text-center">Necesitas <strong>Nivel 10</strong> para hacer Prestige</div>\n<div class="bot-card-footer">Tu nivel actual: ${pData.activity_level || 1} · ¡Sigue ganando XP!</div>\n</div>`;
                    break;
                }

                const nextPrestige = (pData.prestige_level || 0) + 1;
                const { data: pResult } = await supabase.rpc('prestige_user', { p_user_id: user.id });
                if (!pResult?.success) { response = '❌ Error al procesar el prestige.'; break; }

                const badge = '✦'.repeat(Math.min(nextPrestige, 5));
                response = `<div class="bot-card">\n<div class="bot-card-label">✦ ¡PRESTIGE ${nextPrestige}! · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-xl bot-text-center"><strong>${badge}</strong></div>\n<div class="bot-card-footer">Tu XP se reinició a 0. Has ganado el badge <strong>Prestige ${nextPrestige}</strong> visible en /rank 🌌</div>\n</div>`;
                break;
            }

            // ── /title ────────────────────────────────────────────────
            case '/title': {
                const TITLES = [
                    { id: 'Viajero', req: 'Nivel 1', minLevel: 1, minPrestige: 0 },
                    { id: 'Explorador', req: 'Nivel 3', minLevel: 3, minPrestige: 0 },
                    { id: 'Pionero', req: 'Nivel 5', minLevel: 5, minPrestige: 0 },
                    { id: 'Comandante', req: 'Nivel 10', minLevel: 10, minPrestige: 0 },
                    { id: 'Almirante', req: 'Nivel 20', minLevel: 20, minPrestige: 0 },
                    { id: '✦ Estelar', req: 'Prestige 1', minLevel: 1, minPrestige: 1 },
                    { id: '✦✦ Cósmico', req: 'Prestige 2', minLevel: 1, minPrestige: 2 },
                    { id: '✦✦✦ Nebulosa', req: 'Prestige 3', minLevel: 1, minPrestige: 3 },
                ];

                const titleArg = args.join(' ').trim();
                const { data: tData } = await supabase
                    .from('profiles')
                    .select('activity_level, prestige_level')
                    .eq('id', user.id)
                    .single();
                const userLvl = tData?.activity_level || 1;
                const userPrestige = tData?.prestige_level || 0;

                if (!titleArg) {
                    // Mostrar títulos disponibles
                    const titleRows = TITLES.map(t => {
                        const unlocked = userLvl >= t.minLevel && userPrestige >= t.minPrestige;
                        return `<div class="bot-lb-entry">\n<div class="bot-lb-rank">${unlocked ? '✅' : '🔒'}</div>\n<div class="bot-lb-name">${t.id}</div>\n<div class="bot-lb-coins">${t.req}</div>\n</div>`;
                    }).join('\n');
                    response = `<div class="bot-card">\n<div class="bot-card-label">🏷️ Títulos Disponibles · @${senderName}</div>\n<div class="bot-lb-container">${titleRows}</div>\n<div class="bot-card-footer">Usa /title &lt;nombre&gt; para equipar uno desbloqueado</div>\n</div>`;
                    break;
                }

                const found = TITLES.find(t => t.id.toLowerCase() === titleArg.toLowerCase());
                if (!found) { response = `❌ Título **"${titleArg}"** no reconocido. Usa /title para ver la lista.`; break; }
                if (userLvl < found.minLevel || userPrestige < found.minPrestige) {
                    response = `🔒 No has desbloqueado **${found.id}** aún. Requiere: **${found.req}**.`;
                    break;
                }

                await supabase.rpc('set_user_title', { p_user_id: user.id, p_title: found.id });
                response = `<div class="bot-card">\n<div class="bot-card-label">🏷️ Título Equipado · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>${found.id}</strong></div>\n<div class="bot-card-footer">Se muestra en tu /rank 👑</div>\n</div>`;
                break;
            }

            // ── /xp-boost ─────────────────────────────────────────────
            case '/xp-boost': {
                const { data: bResult } = await supabase.rpc('buy_xp_boost', { p_user_id: user.id });
                if (!bResult) { response = '❌ Error al activar el boost.'; break; }

                if (!bResult.success) {
                    if (bResult.reason === 'already_active') {
                        const remaining = Math.ceil((new Date(bResult.expires_at) - new Date()) / 60000);
                        response = `⚡ Ya tienes un XP Boost activo. Expira en **${remaining} min**.`;
                    } else if (bResult.reason === 'insufficient_funds') {
                        response = `💸 Fondos insuficientes. Necesitas **200 ◈** (tienes **${bResult.balance} ◈**).`;
                    } else {
                        response = '❌ No se pudo activar el boost.';
                    }
                    break;
                }

                const expireTime = new Date(bResult.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                response = `<div class="bot-card">\n<div class="bot-card-label">⚡ XP Boost Activado · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-xl bot-text-center"><strong>×2 XP</strong></div>\n<div class="bot-card-footer">-200 ◈ · Activo durante 1 hora (hasta las ${expireTime}) · ¡Chatea y participa para aprovechar! 🚀</div>\n</div>`;
                break;
            }

            // ── /loan ─────────────────────────────────────────────────
            case '/loan':
            case '/prestamo': {
                const loanAmt = parseInt(args[0]);
                if (!loanAmt || isNaN(loanAmt)) {
                    response = '🏦 Uso: **/loan <monto>** (Ej: /loan 500). Consulta el **Banco** en el Hub para ver tu límite.';
                    break;
                }

                const { data: lResult } = await supabase.rpc('request_loan', { p_user_id: user.id, p_amount: loanAmt });
                if (!lResult?.success) {
                    const lLimit = lResult?.limit;
                    const lReason = lResult?.reason;
                    if (lReason === 'already_has_loan') response = `⚠️ Ya tienes una deuda activa de **${lResult.remaining} ◈**. Salda tu cuenta en el Banco para pedir otro.`;
                    else if (lReason === 'limit_exceeded') response = `❌ Límite excedido. El Banco Estelar permite hasta **${lLimit.toLocaleString()} ◈**.`;
                    else response = '❌ No se pudo procesar el préstamo.';
                    break;
                }

                response = `<div class="bot-card">\n<div class="bot-card-label">🏦 Crédito Aprobado · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center">+<strong>${lResult.borrowed} ◈</strong></div>\n<div class="bot-card-footer">Deuda total: ${lResult.total_debt} ◈ (Interés: ${lResult.interest} ◈)<br>Se retendrá el 25% de tus ganancias automágicamente.</div>\n</div>`;
                break;
            }

            // ── /debt ─────────────────────────────────────────────────
            case '/debt':
            case '/deuda': {
                const { data: dData } = await supabase.from('user_loans').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle();
                if (!dData) {
                    response = '✅ No tienes deudas activas con el Banco Estelar. ¡Eres un piloto solvente!';
                    break;
                }
                const isPact = profile?.stellar_pact_active;
                response = `<div class="bot-card">\n<div class="bot-card-label">🏦 Estado de Cuenta · @${senderName}</div>\n<div class="bot-card-answer bot-answer-no bot-text-center">Deuda: <strong>${dData.remaining_debt} ◈</strong></div>\n<div class="bot-card-footer">${isPact ? '<strong>⚠️ PACTO ESTELAR ACTIVO</strong><br>Retención: 50% de ingresos.' : 'Retención activa: 25% de ingresos.'}<br>Paga en el Banco Estelar 🛸</div>\n</div>`;
                break;
            }

            default: return;
        }

        setTimeout(async () => {
            const persistentCmds = [
                '/roll', '/flip', '/status', '/stats', '/hug', '/slap', '/joke', '/quote',
                '/weather', '/pick', '/kiss', '/punch', '/bite', '/pat', '/dance',
                '/duel', '/accept', '/bal', '/daily', '/bet', '/blackjack', '/hit', '/stand',
                '/slots', '/give', '/lb', '/leaderboard', '/work', '/rob', '/ship', '/marry',
                '/profile', '/avatar', '/mood', '/clear', '/tax', '/announce',
                '/help', '/voice', '/8ball', '/confession', '/poll',
                '/rank', '/top-level', '/streak', '/achievements', '/attack',
                '/prestige', '/title', '/xp-boost'
            ];
            if (persistentCmds.includes(cmd)) {
                try {
                    await chatService.sendBotMessage(response, activeChannel);
                } catch (err) { }
            } else {
                setMessages(prev => [...prev, { id: `local-${Date.now()}`, content: response, created_at: new Date().toISOString(), user_id: HYPERBOT.id, author: HYPERBOT, reply: null }].slice(-100));
            }
        }, 1000);
    }, [userProfile, user, balance, awardCoins, transfer, claimDaily, onlineUsers, activeChannel]);

    const handleSendMessage = useCallback(async (content, isVip, replyToId = null) => {
        if (!user || !content.trim()) return;
        const cmd = content.trim().split(' ')[0].toLowerCase();
        const senderName = userProfile?.username || user?.user_metadata?.username || 'Viajero';
        const tempMsg = { id: `temp-${Date.now()}`, content, created_at: new Date().toISOString(), user_id: user.id, author: userProfile || { username: user.user_metadata?.username || 'Tú' }, is_vip: isVip, reply: replyingTo ? { content: replyingTo.content, author: replyingTo.author?.username || 'Anónimo' } : null };

        setMessages(prev => [...prev, tempMsg].slice(-100));

        if (content.startsWith('/')) {
            handleBotCommand(content);
            if (['/help', '/bal'].includes(cmd)) return;
        }

        if (isVip && balance < 50) return alert('Starlys insuficientes.');

        try {
            const sentMsg = await chatService.sendMessage(content, isVip, replyToId, activeChannel);

            // 1. Estadísticas y Nivel de Chat
            chatService.incrementChatStats().then(res => {
                if (res?.level_up) {
                    const sName = userProfile?.username || 'Viajero';
                    chatService.sendBotMessage(
                        `🎊 ¡Felicidades **@${sName}**! Has alcanzado el **Nivel de Chat ${res.chat_level}** 🚀. ¡Sigue explorando!`,
                        activeChannel
                    );
                }
            });

            // 2. Misiones: Voz del Vacío (5 mensajes)
            missionService.updateProgress('social', 1, 'msg_5').catch(() => { });

            // 3. XP de Actividad General
            activityService.awardActivityXP(5, 'message').then(res => {
                if (res?.level_up) {
                    const sName = userProfile?.username || 'Viajero';
                    chatService.sendBotMessage(
                        `🔥 ¡Increíble **@${sName}**! Tu **Nivel de Actividad** ha subido a **${res.activity_level}**. ¡Eres un pilar de la comunidad! 🌌`,
                        activeChannel
                    )
                }
            }).catch(() => { });

            if (isVip) await transfer(HYPERBOT.id, 50, 'VIP Message Cost');
            setReplyingTo(null);
            setIsVipMode(false);

            // 4. Detección de Meteoritos
            if (!content.startsWith('/')) {
                const { data: meteorEv } = await supabase
                    .from('bot_events')
                    .select('*')
                    .eq('type', 'meteor')
                    .eq('status', 'active')
                    .gt('expires_at', new Date().toISOString())
                    .maybeSingle();

                if (meteorEv && content.trim().toLowerCase() === meteorEv.data.keyword.toLowerCase()) {
                    const { data: claimed } = await supabase.rpc('claim_meteor_event', { p_event_id: meteorEv.id, p_user_id: user.id });
                    if (claimed?.success) {
                        await awardCoins(claimed.reward, 'meteor_reward');
                        chatService.sendBotMessage(
                            `<div class="bot-card">\n<div class="bot-card-label">☄️ ¡METEORITO RECLAMADO!</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>@${senderName}</strong> fue el primero</div>\n<div class="bot-card-footer">+${claimed.reward} ◈ depositados 🎉</div>\n</div>`,
                            activeChannel
                        );
                    }
                }
            }

            // 5. Menciones y Notificaciones
            const mentionMatches = [...content.matchAll(/@([\w]+)/g)];
            if (mentionMatches.length > 0) {
                const handles = [...new Set(mentionMatches.map(m => m[1].toLowerCase()))];
                const { data: mentionedUsers } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('username_normalized', handles);

                if (mentionedUsers?.length) {
                    const sName = userProfile?.username || 'Alguien';
                    const channelLabel = activeChannel === 'global' ? '#general' : `#${activeChannel}`;
                    const preview = content.length > 80 ? content.slice(0, 80) + '…' : content;
                    for (const target of mentionedUsers) {
                        if (target.id === user.id) continue;
                        createNotification(
                            target.id,
                            'mention',
                            `@${sName} te mencionó en ${channelLabel}: "${preview}"`,
                            sentMsg?.id || null
                        );
                    }
                }
            }
        } catch (err) {
            console.error('[GlobalChat] Error sending message:', err);
        }
    }, [user, userProfile, balance, awardCoins, transfer, handleBotCommand, replyingTo, activeChannel]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => { });
    };

    const lastVip = messages.filter(m => m.is_vip).pop();

    return (
        <div className="chat-window-wrapper relative overflow-hidden w-full h-full
            lg:grid lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:grid-rows-1">
            {/* Sidebar Backdrop (Mobile) */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Discord-Like de Canales - SIEMPRE visible en desktop */}
            <aside className={`chat-sidebar w-[260px] bg-[#08081a]/98 border-r border-white/5 flex flex-col transition-all duration-300 ease-out z-[1000] ${sidebarOpen ? 'open' : ''}
                lg:relative lg:transform-none lg:block lg:col-start-1`}>
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500/80">Canales Galácticos</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {CHANNELS.map(chan => (
                        <button key={chan.id} onClick={() => { setActiveChannel(chan.id); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeChannel === chan.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/40 hover:bg-white/5 hover:text-white/60'}`}>
                            <span className="text-lg">{chan.icon}</span>
                            <div className="text-left">
                                <p className="text-sm font-bold capitalize">{chan.name}</p>
                                <p className="text-[10px] opacity-40 truncate w-32">{chan.description}</p>
                            </div>
                            {activeChannel === chan.id && <motion.div layoutId="active-pill" className="w-1 h-4 bg-cyan-400 rounded-full" />}
                        </button>
                    ))}

                    {/* Canal de voz temporal + canal de texto vinculado */}
                    {tempVoiceChannel && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 px-2 mb-2">Voz Temporal</p>
                            {/* Botón sala de voz */}
                            <button
                                onClick={() => { setShowVoiceRoom(true); setSidebarOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                            >
                                <span className="text-lg relative">
                                    {tempVoiceChannel.icon}
                                    {inVoiceRoom && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                                </span>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{tempVoiceChannel.name}</p>
                                    <p className="text-[10px] opacity-40">{inVoiceRoom ? 'Conectado' : 'Sala de voz'}</p>
                                </div>
                            </button>
                            {/* Canal de texto vinculado */}
                            {tempTextChannelId && (
                                <button
                                    onClick={() => { setActiveChannel(tempTextChannelId); setSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeChannel === tempTextChannelId ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:bg-white/5 hover:text-white/60'}`}
                                >
                                    <span className="text-lg">💬</span>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate"># {tempVoiceChannel.name}</p>
                                        <p className="text-[10px] opacity-40">Chat de sala</p>
                                    </div>
                                    {activeChannel === tempTextChannelId && <motion.div layoutId="active-pill" className="w-1 h-4 bg-purple-400 rounded-full" />}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-white/5">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black">
                            {userProfile?.username?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate">@{userProfile?.username || 'Anónimo'}</p>
                            <p className="text-[9px] text-white/30 truncate">{balance} ◈ Starlys</p>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col relative min-w-0 min-h-0">
                {/* Channel Header */}
                <header className="h-14 sm:h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 bg-[#050510]/40 backdrop-blur-md z-50">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden text-white/50 hover:text-white p-2 -ml-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-cyan-500 font-bold text-lg">#</span>
                            <span className="text-[13px] sm:text-sm font-black uppercase tracking-wider">{CHANNELS.find(c => c.id === activeChannel)?.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowMissions(true)}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/30 transition-all active:scale-95"
                            title="Misiones Diarias"
                        >
                            <Trophy size={18} />
                        </button>
                        <button
                            onClick={() => setShowCalendar(true)}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-purple-400 hover:bg-purple-400/10 hover:border-purple-400/30 transition-all active:scale-95"
                            title="Calendario"
                        >
                            <Calendar size={18} />
                        </button>
                        <button
                            onClick={() => setShowBadgePicker(true)}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-pink-400 hover:bg-pink-400/10 hover:border-pink-400/30 transition-all active:scale-95"
                            title="Personalizar Badge"
                        >
                            <Palette size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/universo')}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/30 transition-all active:scale-95"
                            title="Mapa Estelar"
                        >
                            <Map size={18} />
                        </button>
                        <div className="flex items-center gap-2 sm:gap-4 opacity-40 text-[9px] sm:text-[10px] font-black uppercase tracking-tighter ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="hidden xs:inline">Conexión Segura</span>
                            <span className="xs:hidden">Live</span>
                        </div>
                    </div>
                </header>

                {/* Mobile Channel Tabs — replaces hamburger UX */}
                <div className="md:hidden flex border-b border-white/5 bg-[#050510]/60 backdrop-blur-md shrink-0">
                    {CHANNELS.map(chan => (
                        <button
                            key={chan.id}
                            onClick={() => setActiveChannel(chan.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${activeChannel === chan.id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/30 border-b-2 border-transparent'}`}
                        >
                            <span>{chan.icon}</span>
                            <span>{chan.name}</span>
                        </button>
                    ))}
                    {tempVoiceChannel && (
                        <button
                            onClick={() => setShowVoiceRoom(true)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${inVoiceRoom ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/30 border-b-2 border-transparent'}`}
                        >
                            <span className="relative">
                                {tempVoiceChannel.icon}
                                {inVoiceRoom && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </span>
                            <span>Voz</span>
                        </button>
                    )}
                </div>

                <div className="chat-messages-container flex-1 min-h-0 relative">
                    {/* Voice Bar - Highly Visible */}
                    <VoicePartyBar
                        activeParticipants={onlineUsers ? Object.values(onlineUsers) : []}
                        onJoin={() => { setHasJoinedVoice(true); setShowVoiceRoom(true); }}
                        onCreateRoom={handleCreateVoiceRoom}
                        isActive={inVoiceRoom}
                        currentRoom={voiceRoomName}
                    />

                    {/* VIP Sticky Message - in flow, below VoicePartyBar */}
                    <AnimatePresence>
                        {lastVip && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mx-4 mt-2 mb-1 pointer-events-none shrink-0"
                            >
                                <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-md border border-amber-500/30 rounded-2xl p-3 shadow-[0_10px_30px_rgba(234,179,8,0.2)]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">★ Transmisión VIP ★</span>
                                        <div className="h-[1px] flex-1 bg-amber-500/20" />
                                        <span className="text-[9px] font-black text-white/60">@{lastVip.author?.username}</span>
                                    </div>
                                    <p className="text-xs text-white/90 line-clamp-1 italic font-medium">"{lastVip.content}"</p>
                                </div>
                            </motion.div>
                        )}
                        {activeEvents.eclipse && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mx-4 mt-2 mb-1 shrink-0"
                            >
                                <div className="bg-indigo-900/40 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-3 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 blur-[2px] animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-tighter italic">Eclipse Galáctico Activo</h4>
                                            <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-widest">Recompensas ×3 Activadas</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-indigo-400 opacity-50 px-3 py-1 bg-black/40 rounded-lg">LIVE</div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="chat-fade-top" />
                    <div ref={scrollRef} className="chat-messages-scroll no-scrollbar pt-4 pb-12 touch-pan-y">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                            </div>
                        ) : (
                            <>
                                {messages.length === 0 && <div className="text-center py-20 opacity-20 text-[10px] uppercase font-black">Silencio espacial...</div>}
                                {messages.map((m, idx) => {
                                    const prevMsg = messages[idx - 1];
                                    const isGrouped = prevMsg &&
                                        prevMsg.user_id === m.user_id &&
                                        (new Date(m.created_at) - new Date(prevMsg.created_at)) < 5 * 60000 &&
                                        !m.reply_to_id &&
                                        !m.is_vip &&
                                        m.user_id !== HYPERBOT.id;

                                    return (
                                        <div key={String(m.id)} id={`msg-${m.id}`} className={`px-4 ${isGrouped ? 'mb-1' : 'mb-4 md:mb-6'}`}>
                                            <ChatMessage
                                                message={m}
                                                isMe={m.user_id === user?.id}
                                                isOnline={m.author?.id && !!onlineUsers[m.author.id]}
                                                userPresence={onlineUsers[m.author?.id]}
                                                onProfileClick={setSelectedProfile}
                                                onReply={setReplyingTo}
                                                isGrouped={isGrouped}
                                            />
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                <ChatInput
                    onSendMessage={handleSendMessage}
                    isVipMode={isVipMode}
                    setIsVipMode={setIsVipMode}
                    balance={balance}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    isAdmin={userProfile?.is_admin}
                    activeChannel={activeChannel}
                />
            </div>

            {/* Panel Lateral Desktop - 320px */}
            <div className="hidden lg:block lg:col-start-3 h-full">
                <ChatSidebar
                    onlineUsers={onlineUsers}
                    recentEvents={recentCosmicEvents}
                    channelStats={channelStats}
                />
            </div>

            <AnimatePresence>
                {selectedProfile && <HoloCard key="holocard" profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
                {showMissions && (
                    <Suspense key="missions" fallback={<ChatSpinner />}>
                        <MissionsPanel onClose={() => setShowMissions(false)} />
                    </Suspense>
                )}
                {showCalendar && (
                    <Suspense key="calendar" fallback={<ChatSpinner />}>
                        <StellarCalendar onClose={() => setShowCalendar(false)} />
                    </Suspense>
                )}
                {showBadgePicker && (
                    <Suspense key="badges" fallback={<ChatSpinner />}>
                        <BadgePicker onClose={() => setShowBadgePicker(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

            {/* VoiceRoomUI fuera de AnimatePresence para evitar desmontaje accidental */}
            {hasJoinedVoice && (
                <Suspense fallback={<ChatSpinner />}>
                    <VoiceRoomUI
                        key="voice-room"
                        roomName={voiceRoomName}
                        isOpen={showVoiceRoom}
                        onMinimize={() => setShowVoiceRoom(false)}
                        onExpand={() => setShowVoiceRoom(true)}
                        onLeave={handleLeaveVoice}
                        onConnected={() => { setInVoiceRoom(true); updatePresence({ inVoice: true, voiceRoom: voiceRoomName }); }}
                        userAvatar={userProfile?.avatar_url}
                        nicknameStyle={userProfile?.equipped_nickname_style}
                        frameId={userProfile?.frame_item_id}
                        userName={userProfile?.username}
                        activityLevel={userProfile?.activity_level}
                        initialPersonalActivity={initialActivity}
                    />
                </Suspense>
            )}
        </div>
    );
}
