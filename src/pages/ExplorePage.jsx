import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Compass,
    Skull,
    Radio,
    Zap,
    Globe,
    Shield,
    Trophy,
    Gamepad2,
    ShoppingBag,
    Newspaper,
    BookOpen,
    Rocket
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { blackMarketService } from '../services/blackMarketService';
import StellarScrollBg from '../components/Effects/StellarScrollBg';

export default function ExplorePage() {
    const { profile } = useAuthContext();
    const [isBlackMarketEligible, setIsBlackMarketEligible] = useState(false);

    useEffect(() => {
        if (profile) {
            setIsBlackMarketEligible(blackMarketService.checkAccessEligibility(profile));
        }
    }, [profile]);

    const sections = [
        {
            id: 'social',
            title: 'Sincronización Social',
            desc: 'Conéctate con otros pilotos en el Feed Global y Chat.',
            icon: <Globe className="text-cyan-400" />,
            links: [
                { label: 'Explorar Centro', to: '/posts', emoji: '📡' },
                { label: 'Mensajería Estelar', to: '/cartas', emoji: '✉️' },
                { label: 'Frecuencia Global', to: '/chat', emoji: '💬' },
                { label: 'Mapa Estelar', to: '/universo', emoji: '🌌' },
                { label: 'Vinculos Estelares', to: '/vinculos', emoji: '🤝' },
            ],
            color: 'cyan'
        },
        {
            id: 'economy',
            title: 'Sistemas Económicos',
            desc: 'Intercambia Starlys, adquiere mejoras y gestiona tu capital.',
            icon: <Zap className="text-amber-400" />,
            links: [
                { label: 'Mercado Estelar', to: '/tienda', emoji: '🛍️' },
                { label: 'Tienda Galáctica', to: '/tienda-galactica', emoji: '💎' },
                { label: 'Banco Central', to: '/banco', emoji: '🏦' },
            ],
            color: 'amber'
        },
        {
            id: 'entertainment',
            title: 'Sectores de Recreación',
            desc: 'Sectores diseñados para el entretenimiento y la competencia.',
            icon: <Gamepad2 className="text-purple-400" />,
            links: [
                { label: 'Zona de Juegos', to: '/games', emoji: '🎮' },
                { label: 'Rankings Globales', to: '/leaderboard', emoji: '🌎' },
            ],
            color: 'purple'
        },
        {
            id: 'info',
            title: 'Archivos y Datos',
            desc: 'Información sobre el sistema y registros de actividad.',
            icon: <Newspaper className="text-blue-400" />,
            links: [
                { label: 'Boletín de Noticias', to: '/bulletin', emoji: '📰' },
                { label: 'Arquitectura', to: '/arquitectura', emoji: '🏗️' },
                { label: 'Libro de Visitas', to: '/guestbook', emoji: '📖' },
            ],
            color: 'blue'
        }
    ];

    return (
        <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 pt-10 px-4 relative">
            <StellarScrollBg />

            <header className="mb-12 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <Compass className="text-cyan-400" size={28} />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Explorar Sistema</h1>
                </div>
                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] ml-1">Central de Navegación y Sincronización Estelar</p>
            </header>

            <AnimatePresence>
                {isBlackMarketEligible && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <Link to="/mercado-negro" className="block group">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-[2rem] p-8 relative overflow-hidden transition-all group-hover:border-red-500/40 group-hover:bg-red-500/10">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Skull size={120} />
                                </div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse border border-red-500/30">
                                        <Radio size={40} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Señal Encriptada Detectada</span>
                                            <div className="h-1 w-12 bg-red-500 animate-pulse" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Interferencia: Sector 7-C (Mercado Negro)</h2>
                                        <p className="text-sm text-white/50 font-bold uppercase">
                                            "Alguien está ofreciendo intercambiar Starlys fuera del Banco Estelar... El acceso ha sido desbloqueado."
                                        </p>
                                    </div>
                                    <div className="px-10 py-4 bg-red-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl group-hover:scale-105 transition-all active:scale-95">
                                        Entrar al Sector
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((section, idx) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all hover:border-white/[0.1]"
                    >
                        <div className="flex items-start gap-6 mb-8">
                            <div className={`w-14 h-14 rounded-2xl bg-${section.color}-500/10 flex items-center justify-center border border-${section.color}-500/20`}>
                                {section.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">{section.title}</h3>
                                <p className="text-[11px] text-white/30 font-bold uppercase tracking-wide leading-relaxed">{section.desc}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {section.links.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg group-hover:scale-110 transition-transform">{link.emoji}</span>
                                        <span className="text-[11px] font-black text-white/60 group-hover:text-white uppercase tracking-widest">{link.label}</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-cyan-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <footer className="mt-20 text-center">
                <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
                <p className="text-[9px] font-black text-white/10 uppercase tracking-[1.5em]">Spacely Terminal v2.5</p>
            </footer>
        </main>
    );
}
