import React from 'react';
import DesktopDownloadSection from '../components/DesktopDownloadSection';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DownloadPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#02020a] text-white selection:bg-blue-500/30">
            {/* Simple Header */}
            <header className="fixed top-0 left-0 w-full z-[100] px-6 py-4 flex items-center justify-between pointer-events-none">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/posts')}
                    className="pointer-events-auto p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white"
                >
                    <ChevronLeft size={16} />
                    Volver
                </motion.button>

                <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Spacely OS • Desktop</span>
                </div>
            </header>

            <main className="pt-20">
                <DesktopDownloadSection />

                {/* Additional minimal content to make it feel like a full page */}
                <section className="pb-32 px-6">
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Requisitos</h4>
                            <p className="text-xs text-white/20 leading-loose">
                                Windows 10 o superior (64-bit).<br />
                                Mínimo 2GB RAM.<br />
                                Espacio en disco: 50MB.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Integridad</h4>
                            <p className="text-xs text-white/20 leading-loose">
                                Firma digital: Spacely Apps Inc.<br />
                                SHA-256: e3b0c442...<br />
                                Escaneado por Microsoft Defender.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Soporte</h4>
                            <p className="text-xs text-white/20 leading-loose">
                                ¿Problemas con la instalación?<br />
                                Contacta con el equipo orbital en el canal de soporte.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-12 border-t border-white/5 text-center">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em]">
                    &copy; 2026 Spacely • Designed for the Stars
                </p>
            </footer>
        </div>
    );
}
