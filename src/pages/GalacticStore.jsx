
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stellarStoreService } from '../services/stellarStoreService';
import { useAuthContext } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import {
    ShoppingBag, Star, Shield, Crown,
    Gem, Zap, ArrowRight, CheckCircle2,
    Lock, Sparkles, AlertCircle, X, ShieldAlert, Bot, Radio, Ticket, Gift
} from 'lucide-react';

// NOTA: Reemplazar con tu Client ID real de PayPal Developer Dashboard
const PAYPAL_CLIENT_ID = "AVZwoe7SUXP6ZXpZnt0GfNIrL0odia6rftWBJDVMFQ5dGKpWtyAPYl_TKmp-2yNHZMyqG3EVEIpNnVgr";

export default function GalacticStore() {
    const { user } = useAuthContext();
    const { refreshBalance } = useEconomy();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null); // 'paypal', 'pagoefectivo', 'yape'
    const [cipData, setCipData] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [showPassPreview, setShowPassPreview] = useState(false);
    const [passRewards, setPassRewards] = useState([]);

    useEffect(() => {
        loadProducts();
        loadPayPalScript();
        loadPassRewards();
    }, []);

    const loadPassRewards = async () => {
        const { data } = await supabase
            .from('stellar_pass_rewards')
            .select('*')
            .order('level', { ascending: true });
        setPassRewards(data || []);
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await stellarStoreService.getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadPayPalScript = () => {
        if (window.paypal) return;
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
        script.async = true;
        document.body.appendChild(script);
    };

    const onPaymentSuccess = () => {
        setSuccessMessage("¡Gracias por tu apoyo! Tus recompensas han sido acreditadas en el Banco Estelar.");
        refreshBalance();
        setSelectedProduct(null);
        setPaymentMethod(null);
        setCipData(null);
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    const handlePagoEfectivo = async (method) => {
        if (!user) return alert('Debes iniciar sesión para proceder.');
        setPaymentLoading(true);
        setPaymentMethod(method);

        try {
            const res = await stellarStoreService.generatePagoEfectivoCIP(
                selectedProduct.id,
                user.id,
                user.email,
                selectedProduct.price * 3.8, // Conversión PEN aprox
                user.user_metadata?.username || user.email
            );

            setCipData({
                cip: res.cip,
                expiry: res.expiry,
                qr: res.qr || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CIP:${res.cip}`,
                method: method
            });
        } catch (e) {
            alert(e.message || 'Error al conectar con PagoEfectivo');
            setPaymentMethod(null);
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-white/20 uppercase tracking-[0.5em] text-xs animate-pulse">Sincronizando Mercado Galáctico...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050510] pt-24 pb-48 px-6 font-sans overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-16">

                {/* Hero / Disclaimer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-8 max-w-3xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                        <Star size={12} className="animate-spin-slow" /> Misión de Expansión
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                        TIENDA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400">GALÁCTICA</span>
                    </h1>

                    <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-white/20 to-purple-500" />
                        <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium italic">
                            “Spacely es un universo en constante expansión. Cada mejora, cada nueva mecánica y cada aventura existe gracias a quienes creen en este proyecto. Si disfrutas explorar la galaxia, apoyar el crecimiento de Spacely adquiriendo uno de los paquetes ayuda a mantener los servidores y expandir este universo.”
                        </p>
                    </div>
                </motion.div>

                {/* Success Message */}
                <AnimatePresence>
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-green-500/20 border border-green-500/40 p-6 rounded-3xl flex items-center gap-4 text-green-400"
                        >
                            <CheckCircle2 size={32} />
                            <p className="font-bold text-sm tracking-tight">{successMessage}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((p, idx) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            onSelect={() => setSelectedProduct(p)}
                            onPreview={() => p.id === 'stellar_pass' ? setShowPassPreview(true) : null}
                            delay={idx * 0.1}
                        />
                    ))}
                </div>

                {/* Footer Note */}
                <div className="text-center opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <AlertCircle size={12} /> Todas las transacciones son seguras y procesadas a través de encriptación estelar de PayPal.
                    </p>
                </div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-xl w-full bg-[#070710] border border-white/10 rounded-[2.5rem] overflow-hidden relative flex flex-col md:flex-row"
                        >
                            <button
                                onClick={() => { setSelectedProduct(null); setPaymentMethod(null); setCipData(null); }}
                                className="absolute top-6 right-6 z-20 p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Info Section */}
                            <div className="md:w-1/3 bg-white/[0.02] p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                                        {getProductIcon(selectedProduct.id)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{selectedProduct.name}</h3>
                                        <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">${selectedProduct.price}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 mt-8 md:mt-0">
                                    {parseMetadata(selectedProduct).slice(0, 3).map((benefit, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <CheckCircle2 size={10} className="text-cyan-500" />
                                            <span className="text-[10px] text-white/40 font-medium">{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center min-h-[400px]">
                                <div className="space-y-6">
                                    <div className="text-center md:text-left">
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Proceder al Pago</p>
                                        <div className="bg-white/5 p-4 rounded-2xl text-[10px] text-white/40 leading-relaxed mb-6">
                                            Haz clic en el botón de abajo para completar tu donación de forma segura vía PayPal. Los beneficios se activarán al instante.
                                        </div>
                                    </div>

                                    <div className="min-h-[150px] flex items-center justify-center">
                                        <PayPalButtons
                                            product={selectedProduct}
                                            userId={user?.id}
                                            onSuccess={onPaymentSuccess}
                                        />
                                    </div>

                                    <p className="text-[9px] text-center text-white/20 uppercase tracking-widest font-bold">
                                        ⚡ Encriptación de Grado Estelar
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Pass Preview Modal */}
            <AnimatePresence>
                {showPassPreview && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="max-w-4xl w-full bg-[#070710] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-[80vh] relative shadow-2xl"
                        >
                            <header className="p-8 border-b border-white/5 shrink-0 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                        <Ticket size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Pase Estelar: <span className="text-cyan-400">Horizonte Estelar</span></h2>
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Explora las recompensas de la temporada</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPassPreview(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 space-y-4 bg-gradient-to-b from-transparent to-black/40">
                                {passRewards.length === 0 ? (
                                    <div className="text-center py-20 opacity-20 text-xs uppercase font-black tracking-widest">Cargando recompensas...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {passRewards.map(rew => (
                                            <div key={rew.id} className={`p-6 rounded-[2rem] border transition-all group relative overflow-hidden ${rew.is_premium ? 'bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40' : 'bg-white/[0.03] border-white/5 hover:border-cyan-500/40'}`}>
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${rew.is_premium ? 'bg-amber-500/20 text-amber-500' : 'bg-white/10 text-white/40'}`}>
                                                        {rew.is_premium ? 'Premium' : 'Gratis'}
                                                    </span>
                                                    <span className="text-xs font-black text-white/40">NIVEL {rew.level}</span>
                                                </div>
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${rew.is_premium ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-cyan-500/10 text-cyan-500'}`}>
                                                        {rew.reward_type === 'starlys' ? <Zap size={24} /> : <Gift size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight">{rew.reward_type === 'starlys' ? `${rew.reward_amount.toLocaleString()} Starlys` : rew.reward_type.charAt(0).toUpperCase() + rew.reward_type.slice(1)}</p>
                                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Recompensa Instantánea</p>
                                                    </div>
                                                </div>
                                                {/* Background decoration */}
                                                <div className={`absolute -bottom-4 -right-4 w-16 h-16 opacity-5 rotate-12 transition-transform group-hover:scale-110 ${rew.is_premium ? 'text-amber-500' : 'text-cyan-500'}`}>
                                                    {rew.reward_type === 'starlys' ? <Zap size={64} /> : <Gift size={64} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <footer className="p-8 border-t border-white/5 shrink-0 bg-white/[0.04] backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                        <Sparkles size={20} />
                                    </div>
                                    <p className="text-[11px] text-white/50 leading-relaxed font-medium">Empiezas al Nivel 1. Gana XP por cada 10 Starlys obtenidos.<br />Alcanza el Nivel 50 para la recompensa final.</p>
                                </div>
                                <button
                                    onClick={() => { setShowPassPreview(false); setSelectedProduct(products.find(p => p.id === 'stellar_pass')); }}
                                    className="w-full md:w-auto px-10 py-4 bg-cyan-500 text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    ¡Subir a Premium Ahora!
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

function ProductCard({ product, onSelect, onPreview, delay }) {
    const isSubscription = product.type === 'subscription';
    const isEmpire = product.id === 'pack_empire' || product.id === 'tier_lord';
    const isPass = product.id === 'stellar_pass';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`group relative flex flex-col h-full bg-[#070710]/40 backdrop-blur-md border ${isEmpire ? 'border-amber-500/30' : isPass ? 'border-cyan-500/30' : 'border-white/5'} rounded-[2.5rem] p-8 hover:border-white/20 transition-all duration-500 overflow-hidden shadow-2xl`}
        >
            {isPass && <div className="absolute top-8 right-8 bg-cyan-500 text-black text-[8px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)] z-20 animate-bounce">TEMPORADA 1</div>}

            {/* Ambient Background Light */}
            {isEmpire && <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700" />}
            {isPass && <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />}

            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            <div className="relative z-10 space-y-8 flex flex-col h-full">
                <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${isSubscription ? 'bg-cyan-500/10 text-cyan-400' : isEmpire ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/40'}`}>
                        {getProductIcon(product.id)}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/60 transition-all">{product.name}</h3>
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isEmpire ? 'text-amber-500/60' : isPass ? 'text-cyan-400/60' : 'text-white/20'}`}>
                            {isSubscription ? 'Suscripción Vitalicia' : isPass ? 'Temporada 1' : 'Paquete Premium'}
                        </p>
                    </div>
                </div>

                <p className="text-[11px] text-white/40 leading-relaxed min-h-[4rem] group-hover:text-white/60 transition-colors">{product.description}</p>

                <div className="flex-1 space-y-3.5">
                    {parseMetadata(product).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3 group/item">
                            <div className={`w-1.5 h-1.5 rounded-full transition-all group-hover/item:scale-150 ${isEmpire ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`} />
                            <span className="text-[11px] font-bold text-white/50 tracking-tight group-hover:text-white/80 transition-colors uppercase">{benefit}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-black text-white/20">$</span>
                        <span className={`text-4xl font-black tracking-tighter transition-all group-hover:scale-110 ${isEmpire ? 'text-amber-500' : 'text-white'}`}>{product.price}</span>
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">USD</span>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={onSelect}
                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-2 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${isSubscription ? 'bg-cyan-500 text-black hover:bg-cyan-400' : isEmpire ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white text-black hover:bg-white/90'}`}
                        >
                            {isSubscription ? 'Ser Miembro' : 'Adquirir Pack'}
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        {isPass && (
                            <button
                                onClick={onPreview}
                                className="w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles size={12} />
                                Previsualizar Pase
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function PayPalButtons({ product, userId, onSuccess }) {
    const containerRef = useRef(null);

    useEffect(() => {
        let isInstanceValid = true;

        const renderButtons = async () => {
            if (!window.paypal || !containerRef.current) return;

            // Limpiamos el contenedor
            containerRef.current.innerHTML = "";

            try {
                const buttons = window.paypal.Buttons({
                    createOrder: (data, actions) => {
                        return actions.order.create({
                            purchase_units: [{
                                amount: { value: product.price.toString() },
                                description: product.name,
                                custom_id: `${product.id}|${userId}`
                            }]
                        });
                    },
                    onApprove: async (data, actions) => {
                        try {
                            await stellarStoreService.verifyPayPalPayment(data.orderID, product.id, userId);
                            onSuccess();
                        } catch (err) {
                            console.error('[PayPalButtons] Verification Error:', err);
                            alert('Error confirmando el pago. Contacta a soporte.');
                        }
                    },
                    style: {
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'pill',
                        label: 'pay'
                    },
                    onError: (err) => {
                        console.warn('[PayPalButtons] SDK Error:', err);
                    }
                });

                if (buttons.isEligible() && isInstanceValid && containerRef.current) {
                    await buttons.render(containerRef.current);
                }
            } catch (err) {
                // Silenciamos el error si es simplemente que el contenedor desapareció
                if (!err.message?.includes('container element removed')) {
                    console.error('[PayPalButtons] Render Error:', err);
                }
            }
        };

        renderButtons();

        return () => {
            isInstanceValid = false;
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [product, userId]);

    return <div ref={containerRef} key={`paypal-container-${product?.id}`} className="w-full max-w-[200px] min-h-[150px]" />;
}

function getProductIcon(id) {
    if (id === 'sub_citizen' || id === 'tier_citizen') return <Crown size={28} />;
    if (id === 'bank_contract') return <Shield size={28} />;
    if (id === 'pack_tycoon') return <Zap size={28} />;
    if (id === 'pack_empire') return <Gem size={28} />;
    if (id === 'tier_explorer') return <Star size={28} />;
    if (id === 'tier_lord') return <Crown size={28} className="text-amber-500" />;
    if (id === 'global_pulse') return <Radio size={28} className="animate-pulse" />;
    if (id === 'bot_assistant') return <Bot size={28} />;
    if (id === 'anti_theft_shield') return <ShieldAlert size={28} />;
    if (id === 'stellar_pass') return <Ticket size={28} className="text-cyan-400 rotate-12" />;
    return <ShoppingBag size={28} />;
}

function parseMetadata(p) {
    const list = [];
    if (p.reward_starlys > 0) list.push(`${p.reward_starlys.toLocaleString()} Starlys Inmediatos`);
    const m = p.metadata;
    if (!m) return list;

    if (m.tier) list.push(`Rango Tier ${m.tier} Permanente`);
    if (m.work_multi) list.push(`Multiplicador x${m.work_multi} en Misiones`);
    if (m.chest_grant) list.push('Cofre de Colección Mensual');
    if (m.custom_color) list.push('Color de Nombre Personalizado');
    if (m.vip_access) list.push('Acceso a Chat VIP');
    if (m.anti_rob_days) list.push(`Protección Anti-Robo (${m.anti_rob_days} días)`);
    if (m.assistant) list.push('Asistente HyperBot Activado');
    if (m.event === 'cosmic_pulse') list.push(`Global x${m.multiplier} (${m.duration} min)`);
    if (m.pass_premium) list.push('Línea de Recompensas Premium');

    if (m.insurance) list.push(`${m.insurance} Seguro de Apuesta`);
    if (m.redemption_ticket) list.push(`${m.redemption_ticket} Ticket de Redención`);
    if (m.badge) list.push(`Insignia: ${m.badge.toUpperCase()}`);
    if (m.effect === 'bankruptcy_protection') list.push('Blindaje Bancario (24h)');
    if (m.effect === 'casino_bonus') list.push('Bono de Casino +10% (24h)');
    if (m.title) list.push(`Título: "${m.title}"`);
    if (m.early_access) list.push('Acceso VIP a Grandes Casas');
    return list;
}
