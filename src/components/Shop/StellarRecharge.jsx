
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stellarStoreService } from '../../services/stellarStoreService';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';


export default function StellarRecharge({ isOpen, onClose }) {
    const { user } = useAuthContext();
    const { refreshBalance } = useEconomy();
    const [step, setStep] = useState('packs'); // 'packs', 'method', 'processing', 'instruction'
    const [packs, setPacks] = useState([]);
    const [selectedPack, setSelectedPack] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [cipData, setCipData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            stellarStoreService.getProducts().then(products => {
                // Filter only packs for the recharge modal
                const packItems = products.filter(p => p.type === 'pack' || p.id === 'sub_citizen');
                setPacks(packItems);
            });
        }
    }, [isOpen]);

    const handleSelectPack = (pack) => {
        setSelectedPack(pack);
        setStep('method');
    };

    const handlePayment = async (method) => {
        if (!user) return alert('Debes iniciar sesión');

        setSelectedMethod(method);
        setLoading(true);
        setStep('processing');

        try {
            if (method === 'yape' || method === 'pagoefectivo') {
                const res = await stellarStoreService.generatePagoEfectivoCIP(
                    selectedPack.id,
                    user.id,
                    user.email,
                    selectedPack.price * 3.8, // Conversión PEN aprox
                    user.user_metadata?.username || user.email
                );

                setCipData({
                    cip: res.cip,
                    expiry: res.expiry,
                    qr: res.qr || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CIP:${res.cip}`,
                    method: method
                });
                setStep('instruction');
            } else {
                // Otros métodos (simulados por ahora)
                setTimeout(() => setStep('success'), 2000);
            }
        } catch (e) {
            alert(e.message || 'Error al conectar con el procesador de pagos');
            setStep('method');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 'method') setStep('packs');
        if (step === 'instruction') setStep('method');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#050510]/95 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-2xl bg-[#0a0a15] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px]"
            >
                {/* Lateral Deco (Hidden on mobile) */}
                <div className="hidden md:flex w-1/3 bg-gradient-to-b from-cyan-600/20 to-purple-800/20 border-r border-white/5 p-8 flex-col justify-between">
                    <div>
                        <div className="text-2xl font-black italic text-cyan-400 mb-2">DAN</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Exchange_Bureau</div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] text-white/40 leading-relaxed italic">
                                "La moneda de las estrellas es el combustible de tus sueños galácticos."
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-75"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse delay-150"></div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-8 md:p-12 relative overflow-y-auto max-h-[90vh]">

                    {step !== 'packs' && step !== 'processing' && (
                        <button onClick={handleBack} className="absolute top-8 left-8 text-white/20 hover:text-white transition-colors text-xl">←</button>
                    )}
                    <button onClick={onClose} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors text-xl">✕</button>

                    <AnimatePresence mode="wait">
                        {step === 'packs' && (
                            <motion.div
                                key="packs"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center md:text-left">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">RECARGAR_◈</h2>
                                    <p className="text-sm text-white/40">Adquiere Starlys instantáneamente para tu Bóveda.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {packs.map(pack => (
                                        <button
                                            key={pack.id}
                                            onClick={() => handleSelectPack(pack)}
                                            className="group relative p-6 bg-white/[0.03] border border-white/5 rounded-3xl text-left hover:bg-white/[0.06] hover:border-white/20 transition-all flex flex-col justify-between min-h-[180px]"
                                        >
                                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                                                {pack.id.includes('citizen') ? '✨' : pack.id.includes('bank') ? '🛡️' : pack.id.includes('tycoon') ? '💎' : '💰'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white/40 uppercase mb-1">{pack.name}</div>
                                                <div className="text-xl font-black text-white italic">
                                                    {pack.reward_starlys > 0 ? `◈ ${pack.reward_starlys.toLocaleString()}` : pack.description}
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-[10px] font-mono text-cyan-400 font-bold">${pack.price}</span>
                                                <span className="text-[9px] font-black text-white/20 uppercase group-hover:text-white transition-colors">Comprar →</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'method' && (
                            <motion.div
                                key="method"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center md:text-left">
                                    <div className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-4">Paso 2 de 3</div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">MÉTODO_DE_PAGO</h2>
                                    <p className="text-sm text-white/40">Selecciona tu canal de transferencia para {selectedPack.name}</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handlePayment('yape')}
                                        className="w-full p-6 bg-[#7d2181]/10 border border-[#7d2181]/30 rounded-2xl flex items-center justify-between group hover:bg-[#7d2181]/20 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#00d7af] rounded-xl flex items-center justify-center text-2xl">💜</div>
                                            <div className="text-left">
                                                <div className="text-sm font-black text-white uppercase italic">Yape / Plin</div>
                                                <div className="text-[10px] text-white/40 font-bold">Transferencia inmediata vía QR o Código</div>
                                            </div>
                                        </div>
                                        <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                                    </button>

                                    <button
                                        onClick={() => handlePayment('pagoefectivo')}
                                        className="w-full p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center justify-between group hover:bg-yellow-500/10 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-xs font-black text-black">PE</div>
                                            <div className="text-left">
                                                <div className="text-sm font-black text-white uppercase italic">PagoEfectivo</div>
                                                <div className="text-[10px] text-white/40 font-bold">Banca Móvil, Agentes y Bodegas</div>
                                            </div>
                                        </div>
                                        <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                                    </button>

                                    <button
                                        onClick={() => handlePayment('paypal')}
                                        className="w-full p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between group hover:bg-blue-500/10 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 text-lg font-bold">P</div>
                                            <div className="text-left">
                                                <div className="text-sm font-black text-white uppercase italic">PayPal / Tarjeta</div>
                                                <div className="text-[10px] text-white/40 font-bold">Global Credits & Debit Cards</div>
                                            </div>
                                        </div>
                                        <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'processing' && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-6 py-12"
                            >
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🛰️</div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase italic">Sincronizando...</h3>
                                    <p className="text-xs text-white/30 font-mono">Conectando con {selectedMethod === 'yape' ? 'NUBE_YAPE' : 'RED_PAGOEFECTIVO'}...</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 'instruction' && (
                            <motion.div
                                key="instruction"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center md:text-left">
                                    <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-4">Orden Generada (CIP)</div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">INSTRUCCIONES_PAGO</h2>
                                    <p className="text-sm text-white/40">Sigue los pasos para completar tu recarga de Starlys.</p>
                                </div>

                                <div className="p-8 bg-white/[0.03] border border-white/10 rounded-3xl space-y-8">
                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="p-4 bg-white rounded-2xl">
                                            <img src={cipData.qr} alt="QR de Pago" className="w-32 h-32" />
                                        </div>
                                        <div className="flex-1 text-center md:text-left space-y-4">
                                            <div>
                                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Código de Pago (CIP)</div>
                                                <div className="text-4xl font-mono font-black text-cyan-400 tracking-tighter">{cipData.cip}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Monto a Pagar</div>
                                                <div className="text-xl font-black text-white italic">S/ {(selectedPack.price * 3.8).toFixed(2)} PEN</div>
                                                <p className="text-[9px] text-white/20">Aprox. ${(selectedPack.price).toFixed(2)} USD</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">1</div>
                                            <p className="text-[11px] text-white/60 leading-relaxed">
                                                Entra a tu app de <strong>Yape</strong> (o banca móvil) y elige la opción de <strong>Pagar Servicios</strong> o <strong>PagoEfectivo</strong>.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">2</div>
                                            <p className="text-[11px] text-white/60 leading-relaxed">
                                                Busca a <strong>PagoEfectivo</strong> (PE) e ingresa el código <strong>{cipData.cip}</strong>.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">3</div>
                                            <p className="text-[11px] text-white/60 leading-relaxed">
                                                Tras pagar, tus ◈ {(selectedPack.reward_starlys || 0).toLocaleString()} se acreditarán automáticamente en unos minutos.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 transition-all"
                                    >
                                        Ya realicé el pago
                                    </button>
                                    <div className="px-6 py-4 flex flex-col justify-center text-center md:text-left">
                                        <span className="text-[8px] font-black text-white/20 uppercase">Expira el:</span>
                                        <span className="text-[10px] font-mono text-pink-500/60">{cipData.expiry}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
