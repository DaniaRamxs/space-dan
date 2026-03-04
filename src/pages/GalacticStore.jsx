
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stellarStoreService } from '../services/stellarStoreService';
import { useAuthContext } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import {
    ShoppingBag, Star, Shield, Crown,
    Gem, Zap, ArrowRight, CheckCircle2,
    Lock, Sparkles, AlertCircle, X
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

    useEffect(() => {
        loadProducts();
        loadPayPalScript();
    }, []);

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
        setTimeout(() => setSuccessMessage(null), 5000);
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

            {/* PayPal Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-md w-full bg-[#070710] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="space-y-6 text-center">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Proceder al Pago</p>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedProduct.name}</h2>
                                    <p className="text-3xl font-black text-white mt-2 font-mono">${selectedProduct.price}</p>
                                </div>

                                <div className="bg-white/5 p-4 rounded-2xl text-[10px] text-white/40 leading-relaxed">
                                    Haz clic en el botón de abajo para completar tu donación de forma segura. Los beneficios se activarán al instante.
                                </div>

                                <div className="min-h-[150px] flex items-center justify-center">
                                    <PayPalButtons
                                        product={selectedProduct}
                                        userId={user?.id}
                                        onSuccess={onPaymentSuccess}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProductCard({ product, onSelect, delay }) {
    const isSubscription = product.type === 'subscription';
    const isEmpire = product.id === 'pack_empire';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`group relative flex flex-col h-full bg-[#070710] border ${isEmpire ? 'border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.1)]' : 'border-white/5'} rounded-[2.5rem] p-8 hover:border-white/20 transition-all overflow-hidden`}
        >
            {isEmpire && <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent pointer-events-none" />}

            <div className="relative z-10 space-y-8 flex flex-col h-full">
                <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSubscription ? 'bg-cyan-500/10 text-cyan-400' : isEmpire ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/40'}`}>
                        {getProductIcon(product.id)}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{product.name}</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{isSubscription ? 'Suscripción Mensual' : 'Paquete Especial'}</p>
                    </div>
                </div>

                <p className="text-xs text-white/40 leading-relaxed min-h-[4rem]">{product.description}</p>

                <div className="flex-1 space-y-3">
                    {parseMetadata(product).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 size={12} className="text-cyan-500 shrink-0" />
                            <span className="text-[11px] font-medium text-white/60 tracking-tight">{benefit}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 pt-4">
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-black text-white/20">$</span>
                        <span className="text-4xl font-black text-white tracking-tighter">{product.price}</span>
                    </div>

                    <button
                        onClick={onSelect}
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-2 ${isSubscription ? 'bg-cyan-500 text-black hover:bg-cyan-400' : isEmpire ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/[0.05] text-white hover:bg-white/10 border border-white/10'}`}
                    >
                        {isSubscription ? 'Ser Miembro' : 'Adquirir Pack'}
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function PayPalButtons({ product, userId, onSuccess }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!window.paypal || !containerRef.current) return;

        // Limpiamos el contenedor por si acaso
        containerRef.current.innerHTML = "";

        window.paypal.Buttons({
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
                    // Llamar a nuestra Edge Function para verificar y entregar premios
                    await stellarStoreService.verifyPayPalPayment(data.orderID, product.id, userId);
                    onSuccess();
                } catch (err) {
                    alert('Error confirmando el pago. Contacta a soporte.');
                }
            },
            style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'pill',
                label: 'pay'
            }
        }).render(containerRef.current);
    }, [product, userId]);

    return <div ref={containerRef} className="w-full max-w-[200px]" />;
}

function getProductIcon(id) {
    if (id === 'sub_citizen') return <Crown size={28} />;
    if (id === 'bank_contract') return <Shield size={28} />;
    if (id === 'pack_tycoon') return <Zap size={28} />;
    if (id === 'pack_empire') return <Gem size={28} />;
    return <ShoppingBag size={28} />;
}

function parseMetadata(p) {
    const list = [];
    if (p.reward_starlys > 0) list.push(`${p.reward_starlys.toLocaleString()} Starlys`);
    const m = p.metadata;
    if (m.insurance) list.push(`${m.insurance} Seguro de Apuesta`);
    if (m.redemption_ticket) list.push(`${m.redemption_ticket} Ticket de Redención`);
    if (m.badge) list.push(`Insignia: ${m.badge.toUpperCase()}`);
    if (m.effect === 'bankruptcy_protection') list.push('Blindaje Bancario (24h)');
    if (m.effect === 'casino_bonus') list.push('Bono de Casino +10% (24h)');
    if (m.title) list.push(`Título: "${m.title}"`);
    if (m.early_access) list.push('Acceso VIP a Grandes Casas');
    return list;
}
