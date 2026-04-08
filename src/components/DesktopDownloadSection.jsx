import React from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Shield, Zap, Cpu, Globe, Monitor } from 'lucide-react';

const FEATURE_LIST = [
    { icon: Cpu, text: "Rendimiento nativo" },
    { icon: Zap, text: "Instalador ligero" },
    { icon: Shield, text: "Seguro y privado" },
    { icon: Globe, text: "Funciona sin conexión" },
];

export default function DesktopDownloadSection() {
    return (
        <section className="relative py-24 overflow-hidden bg-[#02020a]">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Animated Stars (CSS) */}
                <div className="absolute inset-0 opacity-20">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 2 + 1}px`,
                                height: `${Math.random() * 2 + 1}px`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${Math.random() * 3 + 2}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Glow Effects */}
                <div className="absolute top-1/4 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">

                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
                            <Monitor size={14} className="text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Desktop Experience</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                            Descargar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Spacely</span>
                        </h2>

                        <p className="text-lg text-white/60 mb-10 max-w-xl leading-relaxed">
                            Usa Spacely como una aplicación de escritorio rápida y ligera. Disfruta de una experiencia inmersiva con todas las ventajas de una App nativa.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 max-w-lg mx-auto lg:mx-0">
                            {FEATURE_LIST.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <feature.icon size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-white/80">{feature.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center lg:items-start gap-6">
                            {/* Windows Download */}
                            <div className="flex flex-col items-center lg:items-start gap-4">
                                <motion.a
                                    href="https://github.com/DaniaRamxs/space-dan/releases/download/deskopt-v1.1/spacely.exe"
                                    download
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-shadow"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Monitor size={18} />
                                    <span>Windows App</span>
                                    <Download size={16} className="opacity-50" />
                                </motion.a>

                                <div className="flex items-center gap-4 px-2">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Tamaño</span>
                                        <span className="text-[10px] font-bold text-white/60">~12 MB</span>
                                    </div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Versión</span>
                                        <span className="text-[10px] font-bold text-white/60">v1.0.0</span>
                                    </div>
                                </div>
                            </div>

                            {/* Android Download */}
                            <div className="flex flex-col items-center lg:items-start gap-4">
                                <motion.a
                                    href="https://github.com/DaniaRamxs/space-dan/releases/download/v1.3.6/spacely1.3.6.apk"
                                    download
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-400 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-shadow"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M17.523 15.3414c-.5511 0-.9978-.4467-.9978-.9978 0-.5511.4467-.9978.9978-.9978.5511 0 .9978.4467.9978.9978 0 .5511-.4467.9978-.9978.9978m-11.046 0c-.5511 0-.9978-.4467-.9978-.9978 0-.5511.4467-.9978.9978-.9978.5511 0 .9978.4467.9978.9978 0 .5511-.4467.9978-.9978.9978M12.037 6.4636c4.5451 0 8.229 3.5134 8.229 7.8465v.6652H3.808v-.6652c0-4.3331 3.684-7.8465 8.229-7.8465m0-1.6625c-2.4334 0-4.6046.9978-6.1541 2.6106l-.95-.9501c-.1901-.1901-.4988-.1901-.689 0-.1901.1901-.1901.4988 0 .689l1.0451 1.045c-1.4251 1.6391-2.2801 3.7794-2.2801 6.1065v1.6625h16.0374v-1.6625c0-2.327-.855-4.4674-2.2802-6.1065l1.0451-1.045c.1901-.1901.1901-.4988 0-.689-.1901-.1901-.4988-.1901-.689 0l-.95.95c-1.5496-1.6128-3.7208-2.6107-6.1541-2.6107" />
                                    </svg>
                                    <span>Android APK</span>
                                    <Download size={16} className="opacity-50" />
                                </motion.a>

                                <div className="flex items-center gap-4 px-2">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Tamaño</span>
                                        <span className="text-[10px] font-bold text-white/60">~18 MB</span>
                                    </div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Versión</span>
                                        <span className="text-[10px] font-bold text-white/60">v1.2.4</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5 w-full">
                            <h4 className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] mb-4">Enlaces Directos</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white/80">GitHub Releases</span>
                                        <span className="text-[8px] text-white/20 uppercase tracking-widest">Repositorio Oficial</span>
                                    </div>
                                    <a
                                        href="https://github.com/DaniaRamxs/space-dan/releases"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-black border border-white/10 px-4 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all"
                                    >
                                        VER TODO
                                    </a>
                                </div>
                                <div className="w-full h-px bg-white/5" />
                                <div className="grid grid-cols-2 gap-4">
                                    <a href="https://github.com/DaniaRamxs/space-dan/releases/latest/download/Spacely-setup.exe" className="text-[9px] font-bold text-blue-400/60 hover:text-blue-400 transition-colors uppercase tracking-tighter flex items-center gap-2">
                                        <Download size={10} /> Windows Mirror
                                    </a>
                                    <a href="https://github.com/DaniaRamxs/space-dan/releases/latest/download/Spacely.apk" className="text-[9px] font-bold text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase tracking-tighter flex items-center gap-2">
                                        <Download size={10} /> Android Mirror
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Visual Side */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex-1 relative"
                    >
                        <div className="relative z-20 rounded-[3rem] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-2xl">
                            <div className="rounded-[2.5rem] overflow-hidden aspect-video bg-black/40 border border-white/5 relative group">
                                {/* Simulated App UI Preview */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                                <div className="absolute top-4 left-4 flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                                </div>
                                <div className="w-full h-full flex items-center justify-center p-12">
                                    <div className="relative">
                                        <div className="absolute -inset-16 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
                                        <Monitor size={120} className="text-white/20 relative z-10" strokeWidth={1} />
                                        <Download size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-12 -right-8 w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl border border-white/20 z-30"
                        >
                            <Zap size={32} className="text-white" />
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-6 -left-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl border border-white/20 z-30"
                        >
                            <CheckCircle2 size={28} className="text-white" />
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
