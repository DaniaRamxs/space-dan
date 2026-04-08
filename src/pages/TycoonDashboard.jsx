
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tycoonService } from '../services/tycoonService';
import { useAuthContext } from '../contexts/AuthContext';
import {
    Crown, TrendingUp, ShieldAlert, BarChart3,
    Pickaxe, Landmark, Rocket, ChevronRight,
    AlertTriangle, CheckCircle2, History
} from 'lucide-react';

const PROJECTS = [
    {
        id: 'asteroid_mine',
        title: 'Mina de Asteroides',
        description: 'Extracción de minerales raros en el cinturón exterior.',
        cost: 10000000,
        risk: '20%',
        payout: 'Bajo / Constante',
        icon: Pickaxe,
        color: 'cyan'
    },
    {
        id: 'orbital_station',
        title: 'Estación Orbital',
        description: 'Centro logístico para el comercio trans-estelar.',
        cost: 25000000,
        risk: '30%',
        payout: 'Medio / Seguro',
        icon: Landmark,
        color: 'amber'
    },
    {
        id: 'trade_portal',
        title: 'Portal Comercial',
        description: 'La cima del poder económico galáctico.',
        cost: 50000000,
        risk: '45%',
        payout: 'Alto / Arriesgado',
        icon: Rocket,
        color: 'violet'
    }
];

export default function TycoonDashboard() {
    const { profile } = useAuthContext();
    const [status, setStatus] = useState(null);
    const [investments, setInvestments] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('invest');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [s, invs, lb] = await Promise.all([
                tycoonService.getTycoonStatus(),
                tycoonService.getInvestments(),
                tycoonService.getLeaderboard()
            ]);
            setStatus(s);
            setInvestments(invs);
            setLeaderboard(lb);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvest = async (project) => {
        if (profile.balance < project.cost) return alert('Fondos insuficientes');
        if (!window.confirm(`¿Confirmar inversión de ${project.cost.toLocaleString()} ◈?`)) return;

        try {
            await tycoonService.startInvestment(project.id, project.cost);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase tracking-[0.5em] text-xs">Sincronizando con el Banco Estelar...</div>;

    if (!status) return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-6">
                <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">ACCESO RESTRINGIDO</h1>
                <p className="text-sm text-white/40 leading-relaxed">
                    Esta sección está reservada para los miembros de las <span className="text-amber-500 font-bold">Grandes Casas</span>.
                    Regresa cuando tu fortuna sea digna de los magnates.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest rounded-xl"
                >
                    Retroceder
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050510] pt-24 pb-32 px-6 font-sans">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header / Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-[2.5rem] p-8 space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Crown size={80} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Magnate Registrado</p>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{profile.username}</h1>
                        </div>
                        <div className="flex gap-8 pt-4">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Puntos de Influencia</p>
                                <p className="text-xl font-black text-white">{status.influence_points}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Nivel de Casa</p>
                                <p className="text-xl font-black text-white">Tier {status.house_level}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Liquidez Actual</p>
                        <p className="text-3xl font-black text-cyan-400 leading-none tracking-tighter">◈ {profile.balance.toLocaleString()}</p>
                    </div>

                    <div
                        onClick={async () => {
                            if (!window.confirm('¿Solicitar auditoría formal del Banco Estelar? Esto podría resultar en multas si se detectan irregularidades.')) return;
                            const res = await tycoonService.triggerAudit();
                            alert(`Resultado de la Auditoría: ${res.result.toUpperCase()}\nImpacto: ◈ ${res.amount.toLocaleString()}`);
                            loadData();
                        }}
                        className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center items-center gap-4 group cursor-pointer hover:border-rose-500/40 transition-all"
                    >
                        <AlertTriangle className="text-rose-500 group-hover:animate-bounce" />
                        <div className="text-center">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Auditoría Bancaria</p>
                            <p className="text-lg font-black text-rose-500">SOLICITAR REVISIÓN</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 pb-4">
                    {['invest', 'history', 'ranking'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-black' : 'text-white/30 hover:text-white'}`}
                        >
                            {t === 'invest' ? 'Inversiones' : t === 'history' ? 'Historial' : 'Ranking de Magnates'}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="space-y-12">
                    {tab === 'invest' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {PROJECTS.map(p => (
                                    <motion.div
                                        key={p.id}
                                        whileHover={{ y: -8 }}
                                        className="bg-[#070710] border border-white/5 rounded-[2rem] p-8 space-y-6 hover:border-white/20 transition-all relative group overflow-hidden"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl bg-${p.color}-500/10 flex items-center justify-center text-${p.color}-400 mb-2`}>
                                            <p.icon size={28} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white">{p.title}</h3>
                                            <p className="text-xs text-white/40 leading-relaxed">{p.description}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                            <div>
                                                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Riesgo</p>
                                                <p className="text-xs font-bold text-rose-400">{p.risk}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Retorno</p>
                                                <p className="text-xs font-bold text-cyan-400">{p.payout}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInvest(p)}
                                            className="w-full py-4 bg-white/[0.03] border border-white/10 group-hover:bg-white group-hover:text-black transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            Invertir ◈ {(p.cost / 1000000).toFixed(0)}M
                                            <ArrowRight size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Active Investments */}
                            <div className="space-y-6">
                                <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.4em] flex items-center gap-2">
                                    <TrendingUp size={16} /> En Progreso
                                </h2>
                                <div className="space-y-4">
                                    {investments.filter(i => i.status === 'active').map(i => (
                                        <div key={i.id} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                    <Rocket size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white uppercase tracking-tight">{i.project_type.replace('_', ' ')}</p>
                                                    <p className="text-[10px] text-white/30 font-mono">ID: {i.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Monto Invertido</p>
                                                <p className="text-sm font-black text-white">◈ {i.amount_invested.toLocaleString()}</p>
                                            </div>
                                            <div className="min-w-[120px]">
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Finaliza en</p>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                                        initial={{ width: '0%' }}
                                                        animate={{ width: '100%' }}
                                                        transition={{ duration: 60, repeat: Infinity }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {investments.filter(i => i.status === 'active').length === 0 && (
                                        <div className="p-12 text-center text-[10px] text-white/20 uppercase tracking-widest border border-dashed border-white/10 rounded-3xl">
                                            Ningún capital en movimiento actualmente
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'history' && (
                        <div className="space-y-4">
                            {investments.filter(i => i.status !== 'active').map(i => (
                                <div key={i.id} className={`bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-6 ${i.status === 'failed' ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        {i.status === 'completed' ? <CheckCircle2 className="text-cyan-400" /> : <XCircle className="text-rose-500" />}
                                        <div>
                                            <p className="text-sm font-bold text-white uppercase tracking-tight">{i.project_type.replace('_', ' ')}</p>
                                            <p className="text-[9px] text-white/20 font-mono italic">Finalizado el {new Date(i.payout_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Resultado de Operación</p>
                                        <p className={`text-sm font-black ${i.status === 'completed' ? 'text-cyan-400' : 'text-rose-500'}`}>
                                            {i.status === 'completed' ? `+ ◈ ${i.profit_generated.toLocaleString()}` : `- ◈ ${i.amount_invested.toLocaleString()}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'ranking' && (
                        <div className="bg-[#070710] border border-white/10 rounded-[2.5rem] overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="border-b border-white/10 bg-white/[0.02]">
                                    <tr className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                        <th className="p-8">Magnate</th>
                                        <th className="p-8">Fortuna Total</th>
                                        <th className="p-8 text-center">Nivel</th>
                                        <th className="p-8 text-center">Inversiones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {leaderboard.map((m, idx) => (
                                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-8">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-mono text-white/20">#{idx + 1}</span>
                                                    <div className="w-10 h-10 rounded-xl bg-black overflow-hidden border border-white/10">
                                                        <img src={m.avatar_url || '/dan_profile.jpg'} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className="text-sm font-bold text-white uppercase tracking-tight">{m.username}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className="text-sm font-black text-cyan-400 font-mono">◈ {m.net_worth.toLocaleString()}</span>
                                            </td>
                                            <td className="p-8 text-center">
                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black italic">T{m.house_level}</span>
                                            </td>
                                            <td className="p-8 text-center">
                                                <span className="text-xs font-bold text-white/40">{m.active_investments}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ArrowRight({ size }) {
    return <ChevronRight size={size} />;
}

function XCircle({ className }) {
    return <AlertTriangle className={className} />;
}
