import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { Landmark, ArrowUpRight, History, ShieldCheck, AlertCircle, Info, Wallet } from 'lucide-react';
import { useEconomy } from '../contexts/EconomyContext';

export default function BankPage() {
    const { user, profile } = useAuthContext();
    const { balance, refreshBalance } = useEconomy();
    const [loanData, setLoanData] = useState(null);
    const [pactEligibility, setPactEligibility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (user) fetchBankData();
    }, [user]);

    async function fetchBankData() {
        setLoading(true);
        const [loanRes, eligibilityRes] = await Promise.all([
            supabase.from('user_loans').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
            supabase.rpc('check_stellar_pact_eligibility', { p_user_id: user.id })
        ]);

        setLoanData(loanRes.data);
        setPactEligibility(eligibilityRes.data);
        setLoading(false);
    }

    const handleLoan = async () => {
        if (!amount || isNaN(amount) || amount < 100) {
            setStatusMsg({ type: 'error', text: 'Monto mínimo: 100 ◈' });
            return;
        }

        setProcessing(true);
        const { data, error } = await supabase.rpc('request_loan', {
            p_user_id: user.id,
            p_amount: parseInt(amount)
        });

        if (error || !data.success) {
            const reason = data?.reason || 'Error en la conexión';
            const msgs = {
                already_has_loan: 'Ya tienes un crédito activo.',
                stellar_pact_active: 'Pacto Estelar activo: No puedes pedir nuevos créditos.',
                limit_exceeded: `Límite excedido. Máximo: ${data?.limit} ◈`,
                minimum_amount: 'El monto es demasiado bajo.'
            };
            setStatusMsg({ type: 'error', text: msgs[reason] || reason });
        } else {
            setStatusMsg({ type: 'success', text: `¡Crédito aprobado! +${data.borrowed} ◈` });
            setAmount('');
            fetchBankData();
            refreshBalance();
        }
        setProcessing(false);
    };

    const handlePay = async (manualAmount) => {
        setProcessing(true);
        const { data, error } = await supabase.rpc('pay_loan', {
            p_user_id: user.id,
            p_amount: parseInt(manualAmount || loanData?.remaining_debt)
        });

        if (error || !data.success) {
            setStatusMsg({ type: 'error', text: 'Saldo insuficiente o error.' });
        } else {
            setStatusMsg({ type: 'success', text: `Pago procesado: -${data.paid} ◈` });
            fetchBankData();
            refreshBalance();
        }
        setProcessing(false);
    };

    const handleAcceptPact = async () => {
        setProcessing(true);
        const { data, error } = await supabase.rpc('accept_stellar_pact', {
            p_user_id: user.id
        });

        if (error || !data.success) {
            setStatusMsg({ type: 'error', text: 'No se pudo activar el pacto.' });
        } else {
            setStatusMsg({ type: 'success', text: `¡Pacto activado! Impulso de +${data.impulse} ◈ recibido.` });
            fetchBankData();
            refreshBalance();
        }
        setProcessing(false);
    };

    const maxLoan = 15000000;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 min-h-screen">
            <header className="mb-10 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                        <Landmark size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">BANCO ESTELAR</h1>
                </div>
                <p className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase">Sistema de Crédito y Financiamiento Galáctico</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Panel de Estado / Solicitud */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 border border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Wallet size={80} />
                        </div>

                        <h2 className="text-sm font-black text-white/30 uppercase tracking-widest mb-6">Tu Bóveda Estelar</h2>
                        <div className="flex items-end gap-3 mb-1">
                            <span className="text-5xl font-black text-white tracking-tighter">{balance?.toLocaleString()}</span>
                            <span className="text-amber-500 font-bold mb-2">◈</span>
                        </div>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Balance Disponible para retiro</p>
                    </div>

                    {!loanData ? (
                        <div className="glass-panel p-8 border border-white/10 rounded-[2.5rem] space-y-6 bg-gradient-to-br from-white/[0.03] to-transparent">
                            <div>
                                <h2 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Solicitar Crédito</h2>
                                <p className="text-xs text-white/40 leading-relaxed">
                                    Obtén Starlys al instante. Se aplicará un <span className="text-white">15% de interés</span> y se retendrá el <span className="text-white">25% de tus ganancias</span> hasta saldar la deuda.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-white/30">Monto del Préstamo</span>
                                        <span className="text-cyan-400">Límite: {maxLoan} ◈</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Ingresa cantidad..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black">◈</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLoan}
                                    disabled={processing}
                                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                                >
                                    <ArrowUpRight size={18} />
                                    Aprobar Financiación
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`glass-panel p-8 border rounded-[2.5rem] space-y-6 bg-gradient-to-br from-rose-500/5 to-transparent ${profile?.stellar_pact_active ? 'border-amber-500/30' : 'border-rose-500/20'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-rose-400">
                                    <AlertCircle size={20} className={profile?.stellar_pact_active ? 'text-amber-400' : 'text-rose-400'} />
                                    <h2 className={`text-xl font-black uppercase italic tracking-tight ${profile?.stellar_pact_active ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {profile?.stellar_pact_active ? 'Pacto Estelar Activo' : 'Deuda Activa'}
                                    </h2>
                                </div>
                                {profile?.stellar_pact_active && (
                                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                                        Modo Recuperación
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-xl font-black text-white">{loanData.total_debt} ◈</p>
                                </div>
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Restante</p>
                                    <p className={`text-xl font-black animate-pulse ${profile?.stellar_pact_active ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {loanData.remaining_debt} ◈
                                    </p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border flex gap-3 items-start ${profile?.stellar_pact_active ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                <Info size={16} className={`shrink-0 mt-0.5 ${profile?.stellar_pact_active ? 'text-amber-400' : 'text-rose-400'}`} />
                                <p className={`text-[10px] leading-relaxed font-bold uppercase tracking-tight ${profile?.stellar_pact_active ? 'text-amber-300/70' : 'text-rose-300/70'}`}>
                                    {profile?.stellar_pact_active
                                        ? 'Pacto Estelar: El 50% de todas tus ganancias se destina automáticamente a saldar la deuda para restaurar tu órbita.'
                                        : 'SISTEMA DE RETENCIÓN ACTIVO: EL 25% DE CUALQUIER INGRESO SERÁ DEPOSITADO AUTOMÁTICAMENTE PARA SALDAR ESTA DEUDA.'}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handlePay(loanData.remaining_debt)}
                                    disabled={processing}
                                    className="flex-1 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all active:scale-95"
                                >
                                    Saldar Total
                                </button>
                                <button
                                    onClick={() => handlePay(100)}
                                    disabled={processing}
                                    className="px-6 py-4 bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    Pagar 100
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Oferta de Pacto Estelar si es elegible */}
                    {pactEligibility?.eligible && !profile?.stellar_pact_active && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel p-8 border border-amber-500/40 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-transparent space-y-6"
                        >
                            <div className="flex items-center gap-3 text-amber-500">
                                <ShieldCheck size={24} />
                                <h2 className="text-xl font-black uppercase italic tracking-tight">Oportunidad: Pacto Estelar</h2>
                            </div>

                            <p className="text-xs text-white/60 leading-relaxed italic">
                                "El Banco Estelar ha detectado una anomalía en tu constelación financiera. Podemos ofrecerte un Pacto Estelar para restaurar tu órbita económica."
                            </p>

                            <div className="p-4 bg-black/40 rounded-2xl border border-amber-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Beneficio Inicial</span>
                                    <span className="text-xs font-black text-green-400">Impulso Estelar ◈</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Condición</span>
                                    <span className="text-xs font-black text-amber-500">50% Retención</span>
                                </div>
                            </div>

                            <button
                                onClick={handleAcceptPact}
                                disabled={processing}
                                className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            >
                                Aceptar Pacto Estelar
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Info Lateral */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 border border-white/10 rounded-[2.5rem] space-y-6">
                        <h2 className="text-sm font-black text-white/30 uppercase tracking-widest">Protocolos Bancarios</h2>

                        <div className="space-y-4">
                            <BankInfoItem
                                icon={<ShieldCheck className="text-green-400" />}
                                title="Sin Plazos"
                                desc="No hay fecha límite. Puedes pagar a tu ritmo o dejar que la retención automática haga el trabajo."
                            />
                            <BankInfoItem
                                icon={<History className="text-cyan-400" />}
                                title="Historial Transparente"
                                desc="Cada moneda ganada muestra el monto retenido en tus notificaciones de balance."
                            />
                            <BankInfoItem
                                icon={<AlertCircle className="text-amber-400" />}
                                title="Un Crédito a la vez"
                                desc="Para solicitar un nuevo préstamo, debes haber saldado completamente el anterior."
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-cyan-500/5 border border-cyan-500/10 rounded-[2.5rem] flex flex-col items-center text-center">
                        <div className="text-2xl mb-4">🛸</div>
                        <p className="text-[10px] text-cyan-400/50 font-black uppercase tracking-[0.2em] leading-relaxed">
                            "Financiamos tus sueños estelares desde el ciclo solar 2026"
                        </p>
                    </div>
                </div>
            </div>

            {/* Mensajes de Estado */}
            <AnimatePresence>
                {statusMsg.text && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] z-50 shadow-2xl ${statusMsg.type === 'success' ? 'bg-green-500 text-black' : 'bg-rose-500 text-white'
                            }`}
                    >
                        {statusMsg.text}
                        <button onClick={() => setStatusMsg({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

const BankInfoItem = ({ icon, title, desc }) => (
    <div className="flex gap-4 items-start">
        <div className="shrink-0 mt-1">{icon}</div>
        <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">{title}</h3>
            <p className="text-[11px] text-white/30 leading-relaxed font-medium">{desc}</p>
        </div>
    </div>
);
