import { motion } from 'framer-motion';

export default function CabinFocusGuard() {
    return (
        <div className="relative group/guard bg-gradient-to-br from-[#06060c] to-[#0a0a1f] border border-white/5 rounded-3xl p-8 overflow-hidden">
            {/* Animated Shield Aura */}
            <div className="absolute -inset-20 pointer-events-none">
                <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-[80px] animate-pulse-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-500/10 rounded-full animate-ping-slow"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Logo / Icon Area */}
                <div className="relative mb-6">
                    <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover/guard:opacity-100 transition-opacity duration-1000"></div>
                    <div className="w-20 h-20 rounded-2xl bg-black/40 border border-blue-500/30 flex items-center justify-center text-4xl shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                        🛡️
                        {/* Recursive scanning line */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-400/50 animate-[scan_2s_linear_infinite]"></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="text-[10px] font-black tracking-[0.4em] text-blue-400 uppercase">External Module Detected</div>
                        <h3 className="text-2xl font-black italic tracking-tighter text-white">FOCUS <span className="text-blue-500">GUARD</span> PRO</h3>
                    </div>

                    <p className="text-xs text-white/40 leading-relaxed max-w-[240px] mx-auto">
                        Módulo de blindaje cognitivo. Integra protocolos avanzados para prevenir la fragmentación de la atención en el vacío digital.
                    </p>

                    {/* Status Indicators */}
                    <div className="flex justify-center gap-4 py-2">
                        <StatusPill label="SHIELD" active />
                        <StatusPill label="BLOCK" active />
                        <StatusPill label="TRACK" active />
                    </div>

                    <div className="pt-4">
                        <a
                            href="https://github.com/DaniaRamxs/focus-guard-pro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                            Explorar en GitHub
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom Scan Animation CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-ping-slow {
                    animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
        </div>
    );
}

function StatusPill({ label, active }) {
    return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            <div className={`w-1 h-1 rounded-full ${active ? 'bg-blue-400 shadow-[0_0_5px_#60a5fa]' : 'bg-white/20'}`}></div>
            <span className={`text-[8px] font-black tracking-widest ${active ? 'text-blue-400/80' : 'text-white/20'}`}>{label}</span>
        </div>
    );
}
