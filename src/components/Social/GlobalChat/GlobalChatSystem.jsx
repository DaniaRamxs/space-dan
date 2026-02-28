
// v2.8.0 - Discord Mode: Channels & Multi-Room Support 📡🛰️
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useEconomy } from '../../../contexts/EconomyContext';
import * as economyService from '../../../services/economy';
import { chatService } from '../../../services/chatService';
import { supabase } from '../../../supabaseClient';
import ChatMessage, { parseMentions } from './ChatMessage';
import ChatInput from './ChatInput';
import VoicePartyBar from './VoicePartyBar';
import VoiceRoomUI from '../../VoiceRoom/VoiceRoomUI';
import HoloCard from '../../HoloCard';
import { useUniverse } from '../../../contexts/UniverseContext';
import '../../../styles/GlobalChat.css';

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

export default function GlobalChat() {
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
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const scrollRef = useRef(null);
    const messagesEndRef = useRef(null);
    const pendingDuel = useRef(null);
    const activeGames = useRef({}); // { [userId]: { type, data } }
    const processedIds = useRef(new Set());

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

    const loadMessages = async (chanId) => {
        setLoading(true);
        try {
            const data = await chatService.getRecentMessages(50, chanId);
            setMessages(data);
            data.forEach(m => processedIds.current.add(m.id));
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
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        setHasJoinedVoice(false);
        setShowVoiceRoom(false);
        setInVoiceRoom(false);
        setVoiceRoomName('Sala Galáctica');
        setTempVoiceChannel(null);
        setTempTextChannelId(null);
        setActiveChannel(prev => prev.startsWith('voz-') ? 'global' : prev);
        updatePresence({ inVoice: false, voiceRoom: null });
    }, [updatePresence]);

    const handleBotCommand = useCallback(async (content) => {
        const parts = content.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const senderName = userProfile?.username || user?.user_metadata?.username || 'Viajero';
        const getHandValue = (hand) => {
            let val = 0; let aces = 0;
            for (const c of hand) {
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
                        '🔊 `/voice <sala>`: Crear sala de voz.\n' +
                        '⚔️ `/duel @user`: Combate 21.\n' +
                        '✨ `/joke`, `/quote`, `/pick`, `/roll`.';
                }
                break;

            case '/bal':
                response = `<div class="bot-card">\n<div class="bot-card-label">💰 Balance · @${senderName}</div>\n<div class="bot-card-answer bot-answer-maybe bot-text-xl bot-text-center"><strong>${balance.toLocaleString()}</strong></div>\n<div class="bot-card-footer">◈ Dancoins disponibles</div>\n</div>`;
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
                if (isNaN(betAmt) || betAmt < 10) {
                    response = '❌ Uso: `/bet 50`. (Mín. 10 ◈).';
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
                if (isNaN(bjBet) || bjBet < 10) {
                    response = '❌ Uso: `/blackjack <monto>`. (Mín. 10 ◈).';
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
                    '/hug':   [`🤗 **@${senderName}** envuelve a **${target}** en un abrazo estelar.`, `🤗 Un abrazo galáctico de **@${senderName}** llega a **${target}**. ✨`],
                    '/kiss':  [`💋 **@${senderName}** besa a **${target}** bajo la luz de las estrellas.`, `💋 **${target}** recibe un beso de **@${senderName}**. 🌙`],
                    '/slap':  [`👋 **@${senderName}** abofetea a **${target}** con la fuerza de un pulsar.`, `💥 ¡**${target}** recibió una bofetada de **@${senderName}**!`],
                    '/punch': [`👊 **@${senderName}** golpea a **${target}** con energía de quásar.`, `💥 **${target}** fue golpeado por **@${senderName}**. ¡Au!`],
                    '/bite':  [`😬 **@${senderName}** muerde a **${target}**. ¡Cuidado con los dientes cósmicos!`, `🦷 **${target}** fue mordido por **@${senderName}**. 🌌`],
                    '/pat':   [`🫶 **@${senderName}** acaricia a **${target}** con ternura galáctica.`, `✨ Qué bonito gesto de **@${senderName}** hacia **${target}**.`],
                    '/dance': [`💃 **@${senderName}** baila con **${target}** al ritmo del universo. 🎶`, `🕺 **@${senderName}** y **${target}** se mueven al compás estelar. ✨`],
                };
                const pool = socialActions[cmd] || [`✨ **@${senderName}** hace algo con **${target}**.`];
                response = pool[Math.floor(Math.random() * pool.length)];
                break;

            case '/slots':
                const slotsAmt = parseInt(args[0]);
                if (isNaN(slotsAmt) || slotsAmt < 10) {
                    response = '🎰 Uso: `/slots 50`. (Mín. 10 ◈).';
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
                    const top = await economyService.getLeaderboard(5);
                    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                    const rankClasses = ['bot-lb-first', 'bot-lb-second', 'bot-lb-third', '', ''];
                    const entries = top.map((u, i) =>
                        `<div class="bot-lb-entry ${rankClasses[i]}"><div class="bot-lb-rank">${medals[i]}</div><div class="bot-lb-name">@${u.username}</div><div class="bot-lb-coins">${u.balance.toLocaleString()} ◈</div></div>`
                    ).join('\n');
                    response = `<div class="bot-card">\n<div class="bot-card-label">🏆 Top Viajeros Galácticos</div>\n${entries}\n</div>`;
                } catch (e) { response = '❌ Error al consultar el registro estelar.'; }
                break;

            case '/work':
                try {
                    const result = await economyService.workMission(user.id);
                    if (result.success) {
                        response = `<div class="bot-card">\n<div class="bot-card-label">🚀 Misión Completada · @${senderName}</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>+${result.reward} ◈</strong></div>\n<div class="bot-card-footer">Recolección de restos estelares exitosa</div>\n</div>`;
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
                        const result = await economyService.robUser(user.id, robTarget);
                        if (result.success) response = `<div class="bot-card">\n<div class="bot-card-label">🥷 Atraco Espacial</div>\n<div class="bot-card-answer bot-answer-yes bot-text-center"><strong>+${result.amount} ◈</strong></div>\n<div class="bot-card-footer">@${senderName} le robó a @${robTarget} exitosamente 🌌</div>\n</div>`;
                        else if (result.reason === 'caught') response = `<div class="bot-card">\n<div class="bot-card-label">🚨 ¡Capturado!</div>\n<div class="bot-card-answer bot-answer-no bot-text-center"><strong>-${result.penalty} ◈</strong></div>\n<div class="bot-card-footer">@${senderName} fue atrapado intentando robar a @${robTarget}</div>\n</div>`;
                        else if (result.reason === 'cooldown') response = '🕵️ El radar de la policía está activo. Espera un poco.';
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
                '/roll', '/flip', '/weather', '/pick', '/joke', '/quote', '/ship'
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
        const tempMsg = { id: `temp-${Date.now()}`, content, created_at: new Date().toISOString(), user_id: user.id, author: userProfile || { username: user.user_metadata?.username || 'Tú' }, is_vip: isVip, reply: replyingTo ? { content: replyingTo.content, author: replyingTo.author?.username || 'Anónimo' } : null };
        setMessages(prev => [...prev, tempMsg].slice(-100));
        if (content.startsWith('/')) {
            handleBotCommand(content);
            if (['/help', '/bal'].includes(cmd)) return;
        }
        if (isVip && balance < 50) return alert('Dancoins insuficientes.');
        try {
            await chatService.sendMessage(content, isVip, replyToId, activeChannel);
            if (isVip) await transfer(HYPERBOT.id, 50, 'VIP Message Cost');
            setReplyingTo(null);
            setIsVipMode(false);
        } catch (err) { console.error('[GlobalChat] Send Error:', err); }
    }, [user, userProfile, balance, awardCoins, transfer, handleBotCommand, replyingTo, activeChannel]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => { });
    };

    const lastVip = messages.filter(m => m.is_vip).pop();

    return (
        <div className="chat-window-wrapper relative overflow-hidden">
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

            {/* Sidebar Discord-Like */}
            <aside className={`chat-sidebar w-72 bg-[#08081a]/98 border-r border-white/5 flex flex-col transition-all duration-300 ease-out z-[1000] ${sidebarOpen ? 'open' : ''}`}>
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
                            <p className="text-[9px] text-white/30 truncate">{balance} ◈ Dancoins</p>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col relative min-w-0">
                {/* Channel Header */}
                <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 bg-[#050510]/40 backdrop-blur-md z-50">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-white/50 hover:text-white p-2 -ml-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-cyan-500 font-bold text-lg">#</span>
                            <span className="text-[13px] sm:text-sm font-black uppercase tracking-wider">{CHANNELS.find(c => c.id === activeChannel)?.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 opacity-40 text-[9px] sm:text-[10px] font-black uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="hidden xs:inline">Conexión Segura</span>
                        <span className="xs:hidden">Live</span>
                    </div>
                </header>

                <div className="chat-messages-container flex-1 min-h-0 relative">
                    {/* Voice Bar - Highly Visible */}
                    <VoicePartyBar
                        activeParticipants={Object.values(onlineUsers)}
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
                    </AnimatePresence>

                    <div className="chat-fade-top" />
                    <div ref={scrollRef} className="chat-messages-scroll no-scrollbar h-full pt-4 pb-40 touch-pan-y">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                            </div>
                        ) : (
                            <>
                                {messages.length === 0 && <div className="text-center py-20 opacity-20 text-[10px] uppercase font-black">Silencio espacial...</div>}
                                {messages.map((m) => (
                                    <div key={String(m.id)} id={`msg-${m.id}`} className="px-4 mb-2">
                                        <ChatMessage message={m} isMe={m.user_id === user?.id} isOnline={m.author?.id && !!onlineUsers[m.author.id]} userPresence={onlineUsers[m.author?.id]} onProfileClick={setSelectedProfile} onReply={setReplyingTo} />
                                    </div>
                                ))}
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

            <AnimatePresence>
                {selectedProfile && <HoloCard key="holocard" profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            </AnimatePresence>

            {/* VoiceRoomUI fuera de AnimatePresence para evitar desmontaje accidental */}
            {hasJoinedVoice && (
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
                />
            )}
        </div>
    );
}
