
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supportService } from '../../services/supportService';
import { cosmicEventsService } from '../../services/cosmicEventsService';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';

const SUPPORT_TYPES = [
    { id: 'gift', label: 'Regalo normal', icon: '🎁' },
    { id: 'tip', label: 'Propina rápida', icon: '⚡' },
    { id: 'financial_aid', label: 'Apoyo financiero', icon: '🏦' },
    { id: 'bet', label: 'Apuesta entre amigos', icon: '🤝' },
];

export function StellarSupport({ profileUserId, isOwn, profileUsername, autoOpen = false, onModalClose }) {
    const { user } = useAuthContext();
    const { balance, refreshBalance } = useEconomy();

    const [debtProgress, setDebtProgress] = useState(null);
    const [guardians, setGuardians] = useState([]);
    const [recentSupports, setRecentSupports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('gift'); // 'gift' or 'debt'

    // Form state
    const [amount, setAmount] = useState(100);
    const [message, setMessage] = useState('');
    const [supportType, setSupportType] = useState('gift');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [profileUserId]);

    // Abrir modal automáticamente cuando autoOpen cambia a true
    useEffect(() => {
        if (autoOpen) {
            setModalType('gift');
            setShowModal(true);
        }
    }, [autoOpen]);

    async function loadData() {
        try {
            const [progress, guards, recents] = await Promise.all([
                supportService.getDebtProgress(profileUserId),
                supportService.getGuardians(profileUserId),
                supportService.getRecentSupports(profileUserId)
            ]);
            setDebtProgress(progress);
            setGuardians(guards);
            setRecentSupports(recents);
        } catch (e) {
            console.error('Error loading support data:', e);
        }
    }

    async function handleSendSupport() {
        if (!user) return alert('Debes iniciar sesión');
        if (amount <= 0) return alert('El monto debe ser positivo');
        if (amount > balance) return alert('Balance insuficiente');

        setLoading(true);
        try {
            if (modalType === 'debt') {
                await supportService.supportDebt(user.id, profileUserId, amount);
            } else {
                await supportService.sendGift(user.id, profileUserId, amount, message, supportType);
            }

            cosmicEventsService.incrementBond(user.id, profileUserId, 15);

            await loadData();
            await refreshBalance();
            setShowModal(false);
            onModalClose?.();
            setMessage('');
            setAmount(100);
        } catch (e) {
            alert(e.message || 'Error al enviar apoyo');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* ── SECCIÓN DE DEUDA (Si existe) ── */}
            {debtProgress && (
                <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 p-5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">📉</div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Estado financiero: En recuperación</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-white italic">◈ {debtProgress.remaining_debt.toLocaleString()}</span>
                            <span className="text-[10px] text-white/30 uppercase font-bold">Deuda pendiente</span>
                        </div>
                    </div>

                    {/* Barra de Progreso Comunitario */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Apoyo comunitario</p>
                            <p className="text-[10px] font-black text-white/60 italic">
                                {Math.round((debtProgress.support_received / (debtProgress.total_debt || 1)) * 100)}%
                            </p>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(debtProgress.support_received / (debtProgress.total_debt || 1)) * 100}%` }}
                                className="h-full bg-gradient-to-r from-red-500 to-orange-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                            />
                        </div>
                        <p className="text-[9px] text-white/25 italic">Cosecha colectiva: ◈ {debtProgress.support_received.toLocaleString()} recibidos</p>
                    </div>

                    {!isOwn && (
                        <button
                            onClick={() => { setModalType('debt'); setShowModal(true); }}
                            className="w-full py-3 bg-red-500 hover:bg-red-400 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            🤝 Apoyar con Starlys
                        </button>
                    )}
                </div>
            )}

            {/* ── BOTÓN ENVIAR REGALO (Si no es deuda propia) ── */}
            {!isOwn && !debtProgress && (
                <button
                    onClick={() => { setModalType('gift'); setShowModal(true); }}
                    className="w-full py-3 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    🎁 Enviar Regalo o Propina
                </button>
            )}

            {/* ── APOYOS RECIENTES ── */}
            {recentSupports.length > 0 && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Apoyos Recientes</p>
                    <div className="space-y-3">
                        {recentSupports.map(s => (
                            <div key={s.id} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <img src={s.from_user.avatar_url || '/default_user_blank.png'} className="w-8 h-8 rounded-full object-cover" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-[11px] font-bold text-white/70">{s.from_user.username}</p>
                                        <span className="text-[11px] font-black text-cyan-400 italic">◈ {s.amount.toLocaleString()}</span>
                                    </div>
                                    {s.message && <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed italic">"{s.message}"</p>}
                                    <p className="text-[8px] text-white/15 uppercase font-bold mt-2 tracking-widest">
                                        {SUPPORT_TYPES.find(t => t.id === s.support_type)?.label || 'Regalo'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── GUARDIANES ESTELARES ── */}
            {guardians.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-cyan-500/5 to-violet-500/5 border border-white/5 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🛡️</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70">Guardianes Estelares</p>
                    </div>
                    <div className="space-y-2">
                        {guardians.map(g => (
                            <div key={g.donor_username} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors leading-none">
                                <div className="flex items-center gap-2">
                                    <img src={g.donor_avatar || '/default_user_blank.png'} className="w-5 h-5 rounded-full object-cover opacity-60" />
                                    <span className="text-[11px] text-white/50 font-medium">{g.donor_username}</span>
                                </div>
                                <span className="text-[10px] font-black text-white/70 italic">◈ {g.total_contributed.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MODAL DE APOYO ── */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setShowModal(false); onModalClose?.(); }}
                            className="absolute inset-0 bg-[#050510]/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="relative w-full max-w-sm bg-[#0a0a15] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
                        >
                            <div className="text-center space-y-1">
                                <div className="text-4xl mb-2">{modalType === 'debt' ? '🛡️' : '🎁'}</div>
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                                    {modalType === 'debt' ? 'Apoyo a Deuda' : 'Enviar Regalo'}
                                </h3>
                                <p className="text-xs text-white/30">Apoyando a @{profileUsername}</p>
                            </div>

                            <div className="space-y-4">
                                {/* Monto */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Monto (Starlys)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-black italic text-lg">◈</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(Number(e.target.value))}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-black italic text-xl focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-white/20">Tu balance: ◈ {balance.toLocaleString()}</span>
                                        <button onClick={() => setAmount(balance)} className="text-[9px] font-bold text-cyan-500/50 hover:text-cyan-500 uppercase">Usar Máximo</button>
                                    </div>
                                </div>

                                {modalType === 'gift' && (
                                    <>
                                        {/* Tipo de Soporte */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Tipo de envío</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {SUPPORT_TYPES.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setSupportType(t.id)}
                                                        className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${supportType === t.id
                                                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                                                            : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.04]'
                                                            }`}
                                                    >
                                                        <span className="text-base">{t.icon}</span>
                                                        <span className="text-[9px] font-bold leading-tight uppercase">{t.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mensaje */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Mensaje corto</label>
                                            <textarea
                                                value={message}
                                                onChange={e => setMessage(e.target.value.slice(0, 120))}
                                                placeholder="Escribe algo especial..."
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white/70 placeholder:text-white/10 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none h-20"
                                            />
                                            <div className="text-right">
                                                <span className="text-[9px] text-white/10">{message.length}/120</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    disabled={loading || amount <= 0 || amount > balance}
                                    onClick={handleSendSupport}
                                    className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-cyan-400 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    {loading ? 'Transfiriendo...' : 'Confirmar Apoyo Estelar'}
                                </button>
                                <button onClick={() => setShowModal(false)} className="text-[10px] font-bold text-white/20 hover:text-white/40 uppercase tracking-widest py-2">Cancelar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
