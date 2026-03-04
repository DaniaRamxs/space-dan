import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { blackMarketService } from '../services/blackMarketService';
import { useEconomy } from '../contexts/EconomyContext';
import { Skull, AlertTriangle, ShieldX, Terminal, TrendingUp, Ghost, Package, Zap } from 'lucide-react';

export default function BlackMarketPage() {
    const { user, profile } = useAuthContext();
    const { balance, refreshBalance } = useEconomy();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [resultMsg, setResultMsg] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState('trades'); // 'trades' or 'ranking'

    useEffect(() => {
        if (user) {
            loadMarketData();
        }
    }, [user]);

    async function loadMarketData() {
        setLoading(true);
        try {
            const [off, lb] = await Promise.all([
                blackMarketService.getOffers(user.id),
                blackMarketService.getLeaderboard(5)
            ]);
            setOffers(off);
            setLeaderboard(lb);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    const handleTrade = async (offer) => {
        if (balance < offer.cost) {
            setResultMsg({ type: 'error', text: 'Créditos insuficientes para esta operación ilegal.' });
            return;
        }

        setProcessing(true);
        try {
            const res = await blackMarketService.executeTrade(user.id, offer);
            if (res.reason === 'raid_detected') {
                setResultMsg({
                    type: 'raid',
                    text: `🚨 INTERVENCIÓN BANCARIA: El Banco Estelar detectó la señal. Se ha confiscado el costo y se aplicó una multa de ${res.penalty} ◈.`
                });
            } else if (res.success) {
                const results = {
                    success: '✨ Operación exitosa. Los créditos han sido transferidos a través de canales seguros.',
                    fee: '⚠️ Comisión inesperada: Los contrabandistas se quedaron con una parte de la recompensa.',
                    partial_scam: '💀 Estafa parcial: Te enviaron códigos corruptos. Solo una parte de los créditos es válida.',
                    total_scam: '🚫 Estafa total: El comerciante desapareció con tus créditos. Bienvenido al mercado negro.'
                };
                setResultMsg({
                    type: res.result === 'success' ? 'success' : 'warning',
                    text: results[res.result],
                    received: res.received
                });
            }
            refreshBalance();
            loadMarketData();
        } catch (e) {
            setResultMsg({ type: 'error', text: 'Error en la señal: ' + e.message });
        }
        setProcessing(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center font-mono">
            <div className="text-cyan-500 animate-pulse mb-4 text-xs tracking-widest uppercase">Escaneando sectores ocultos...</div>
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020205] text-white/80 font-mono py-12 px-4 relative overflow-hidden">
            {/* Background Glitch Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 w-[500px] h-[500px] bg-red-500/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-1/4 right-1/2 w-[400px] h-[400px] bg-purple-500/20 blur-[100px] rounded-full animate-pulse [animation-delay:1s]" />
                <div className="scanlines" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <header className="mb-12 border-l-4 border-red-500 pl-6 space-y-2">
                    <div className="flex items-center gap-3">
                        <Skull className="text-red-500 animate-pulse" size={32} />
                        <h1 className="text-4xl font-black italic tracking-tighter text-white">MERCADO NEGRO</h1>
                    </div>
                    <p className="text-white/40 text-[10px] tracking-[0.4em] uppercase font-black">Señal no supervisada detectada en Sector 7-C</p>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('trades')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'trades' ? 'bg-red-500 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                        Comerciantes
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ranking' ? 'bg-red-500 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                        Contrabandistas
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {activeTab === 'trades' ? (
                        <>
                            <div className="lg:col-span-2 space-y-6">
                                {offers.map((offer) => (
                                    <motion.div
                                        key={offer.id}
                                        whileHover={{ x: 5 }}
                                        className="group relative bg-[#08080a] border border-white/5 rounded-3xl p-8 hover:border-red-500/30 transition-all overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            {offer.type === 'buy' ? <TrendingUp size={64} /> : offer.type === 'sell' ? <Zap size={64} /> : <Package size={64} />}
                                        </div>

                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2 py-1 bg-red-500/10 rounded">NPC: {offer.merchant}</span>
                                                    {offer.risk > 0.3 && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 py-1 bg-amber-500/10 rounded">ALTO RIESGO</span>}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white italic mb-1 uppercase tracking-tight">{offer.title}</h3>
                                                    <p className="text-xs text-white/40 leading-relaxed max-w-md">{offer.description}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-white/20 uppercase font-bold">Costo</span>
                                                        <span className="text-lg font-black text-white">{offer.cost.toLocaleString()} ◈</span>
                                                    </div>
                                                    <div className="w-px h-8 bg-white/10" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-white/20 uppercase font-bold">Retorno</span>
                                                        <span className="text-lg font-black text-green-400">{offer.reward.toLocaleString()} ◈</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleTrade(offer)}
                                                disabled={processing}
                                                className="md:w-48 py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-red-500 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Ejecutar Trato
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 space-y-6">
                                    <h2 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <AlertTriangle size={14} /> Protocolo de Riesgo
                                    </h2>
                                    <div className="space-y-4">
                                        <RiskFactor label="Transacción segura" val="60%" color="bg-green-500" />
                                        <RiskFactor label="Mercado Inestable (Gastos)" val="25%" color="bg-amber-500" />
                                        <RiskFactor label="Estafa de Red" val="10%" color="bg-rose-500" />
                                        <RiskFactor label="Redada del Banco" val="5%" color="bg-red-600 animate-pulse" />
                                    </div>
                                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[9px] text-red-400 font-bold leading-relaxed uppercase">
                                        Advertencia: El Banco Estelar monitoriza señales inusuales. Las transacciones no están protegidas por el Seguro GDC.
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-6 flex items-center gap-4 italic font-black text-white text-xs">
                                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-black">
                                        <Skull size={18} />
                                    </div>
                                    Tu Reputación Clandestina: {profile?.stealth_reputation || 0}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="lg:col-span-3">
                            <div className="bg-[#08080a] border border-white/5 rounded-[2.5rem] overflow-hidden">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-white italic tracking-tight uppercase">Los Contrabandistas Más Grandes</h2>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Ranking basado en volumen de transacciones no reguladas</p>
                                    </div>
                                    <Terminal className="text-red-500" size={24} />
                                </div>
                                <div className="p-4">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] text-white/20 uppercase tracking-widest font-black">
                                                <th className="px-6 py-4">#</th>
                                                <th className="px-6 py-4">Sujeto</th>
                                                <th className="px-6 py-4">Volumen Movido</th>
                                                <th className="px-6 py-4 text-right">Reputación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {leaderboard.map((user, idx) => (
                                                <tr key={user.username} className="group hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-6 text-sm font-black text-red-500">{String(idx + 1).padStart(2, '0')}</td>
                                                    <td className="px-6 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                                                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username[0]}
                                                            </div>
                                                            <span className="font-black text-white text-sm">@{user.username}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 text-sm font-bold text-white/60">{user.total_volume.toLocaleString()} ◈</td>
                                                    <td className="px-6 py-6 text-right">
                                                        <span className="text-[10px] font-black italic bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20 underline decoration-red-500/50">
                                                            lvl {user.reputation}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals / Results */}
            <AnimatePresence>
                {resultMsg && (
                    <div className="fixed inset-0 bg-[#020205]/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`max-w-md w-full p-10 rounded-[3rem] border-2 text-center space-y-6 ${resultMsg.type === 'raid' ? 'border-red-600 bg-red-600/10' :
                                resultMsg.type === 'success' ? 'border-green-500/30 bg-[#08080a]' :
                                    'border-amber-500/30 bg-[#08080a]'
                                }`}
                        >
                            <div className="flex justify-center">
                                {resultMsg.type === 'raid' ? <ShieldX size={80} className="text-red-500 animate-bounce" /> : <Ghost size={80} className="text-white opacity-20" />}
                            </div>
                            <h2 className={`text-2xl font-black italic uppercase ${resultMsg.type === 'raid' ? 'text-red-500' : 'text-white'}`}>
                                {resultMsg.type === 'raid' ? '¡REDADA DETECTADA!' : 'RESULTADO DEL TRATO'}
                            </h2>
                            <p className="text-sm text-white/60 leading-relaxed uppercase font-bold tracking-tight">
                                {resultMsg.text}
                            </p>
                            {resultMsg.received > 0 && (
                                <div className="text-3xl font-black text-green-400">
                                    +{resultMsg.received.toLocaleString()} ◈
                                </div>
                            )}
                            <button
                                onClick={() => setResultMsg(null)}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-red-500 transition-all"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .scanlines {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}

const RiskFactor = ({ label, val, color }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
            <span>{label}</span>
            <span className="text-white">{val}</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: val }} />
        </div>
    </div>
);
