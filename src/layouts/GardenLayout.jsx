import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import KonamiEasterEgg from "../components/KonamiEasterEgg.jsx";
import { SpacelyLogo } from "../components/SpacelyLogo.jsx";
import GlobalChatPage from "../pages/GlobalChatPage.jsx";

import RadioPlayer from "../components/RadioPlayer.jsx";
import AuthWidget from "../components/AuthWidget.jsx";
import { useEconomy } from '../contexts/EconomyContext';
import NotificationBell from "../components/NotificationBell.jsx";
import StarlysCounter from "../components/StarlysCounter.jsx";
import { useAuthContext } from "../contexts/AuthContext";
import { useUniverse } from "../contexts/UniverseContext";
import { useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

const PERSONAL_PATHS = ['/kinnies', '/tests', '/universo', '/dreamscape'];
const FIXED_LAYOUT_PATHS = ['/cartas', '/desktop', '/chat'];
const isNative = Capacitor.isNativePlatform();

export default function GardenLayout({ children }) {
  const { user, profile: ownProfile } = useAuthContext();
  const { onlineUsers } = useUniverse();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Calcula usuarios activos en chat global (incluidos los de voz)
  const activeChatters = useMemo(() => {
    return Object.values(onlineUsers || {}).filter(u =>
      u?.status?.includes('CHAT GLOBAL') || u?.voiceRoom
    ).length;
  }, [onlineUsers]);

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  // Close HUB & scroll to top on every navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const { balance, claimDaily, canClaimDaily } = useEconomy();
  const [dailyFlash, setDailyFlash] = useState(false);
  const hasCheckedDaily = useRef(false);

  useEffect(() => {
    if (!user || hasCheckedDaily.current) return;
    let mounted = true;
    async function checkDaily() {
      if (canClaimDaily && canClaimDaily()) {
        hasCheckedDaily.current = true;
        try {
          const res = await claimDaily();
          if (mounted && res?.success) {
            setDailyFlash(true);
            setTimeout(() => setDailyFlash(false), 3000);
          }
        } catch (e) {
          // Ya reclamado o error
        }
      }
    }
    checkDaily();
    return () => { mounted = false; };
  }, [user?.id, claimDaily, canClaimDaily]);

  const isFixedLayout = FIXED_LAYOUT_PATHS.some(p => location.pathname.startsWith(p));
  const isGameRoute = location.pathname.startsWith('/game/');

  if (isGameRoute) {
    return (
      <div className="gardenPage w-screen h-screen overflow-hidden" style={{ backgroundColor: '#030305' }}>
        <RadioPlayer />
        {children}
      </div>
    );
  }

  return (
    <div className={`gardenPage ${isFixedLayout ? 'gardenPage--fixed' : ''}`}>
      <KonamiEasterEgg />
      <RadioPlayer />

      <div className={`gardenShell ${isFixedLayout ? 'gardenShell--fixed' : ''}`}>
        <main className={`gardenMain ${isFixedLayout ? 'gardenMain--fixed' : ''}`}>
          <header className="gardenTopbar">
            <div className="topbarLeft">
              <div className="icon-pulse">
                <SpacelyLogo />
              </div>

              <nav className="desktopNav hidden md:flex items-center gap-6">
                <div className="relative group/nav py-4">
                  <NavLink to="/posts" className="desktopNavLink flex items-center gap-3 px-2" end>
                    <span>Social</span>
                    {activeChatters > 0 && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    )}
                  </NavLink>

                  {/* Subsecciones SOCIAL */}
                  <div className="absolute top-[80%] left-0 w-56 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-y-0 group-hover/nav:pointer-events-auto transition-all duration-300 z-[100]">
                    <div className="bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/5 rounded-2xl p-2 shadow-2xl flex flex-col gap-1">
                      <NavLink to="/posts" className={({ isActive }) => `flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-white/5 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`} end>
                        <span className="text-[10px] font-black uppercase tracking-widest">Feed de Exploración</span>
                        <span className="text-[10px]">🌌</span>
                      </NavLink>
                      <NavLink to="/chat" className={({ isActive }) => `flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">Chat Global</span>
                          {activeChatters > 0 && (
                            <span className="text-[8px] font-black text-cyan-400 mt-2 flex items-center gap-2">
                              {activeChatters} ACTIVOS 💬 <span className="inline-block w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                            </span>
                          )}
                        </div>
                        {activeChatters > 0 && <span className="text-[8px] font-black text-cyan-400/40">LIVE 🔴</span>}
                      </NavLink>
                    </div>
                  </div>
                </div>

                <NavLink to="/games" className="desktopNavLink">Juegos</NavLink>
                <NavLink to="/tienda" className="desktopNavLink">Tienda</NavLink>
                <button onClick={() => setMobileMenuOpen(true)} className="desktopNavLink moreBtn">
                  <span>Sístema</span>
                  <span className="text-[10px] opacity-40 ml-1">▼</span>
                </button>
              </nav>
            </div>

            <div className="topbarRight">
              <div className="topbarStats hidden lg:flex">
                <div className="statItem">
                  <span className="statLabel">DNC</span>
                  <StarlysCounter value={balance} className="statValue" />
                </div>
              </div>

              <div className="topbarActions">
                <NotificationBell />
                <NavLink to="/profile" className="topbarUser">
                  <img src={ownProfile?.avatar_url || '/default-avatar.png'} alt="" className="topbarAvatar" />
                </NavLink>
              </div>
            </div>
          </header>

          <div className="gardenContent">{children}</div>

          {/* Botón flotante de Chat (Desktop Fast Access) */}
          {!isFixedLayout && !isNative && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setChatOpen(true)}
              className="hidden md:flex fixed bottom-8 right-8 z-[500] group items-center gap-4 bg-[#0a0a1a]/90 backdrop-blur-2xl border border-white/10 hover:border-cyan-500/30 rounded-full pl-7 pr-6 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] active:shadow-inner transition-all"
            >
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Frecuencia Global</span>
                {activeChatters > 0 && (
                  <span className="text-[8px] font-black text-cyan-400 tracking-widest mt-0.5">{activeChatters} PILOTOS ONLINE</span>
                )}
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                  <span className="text-xl">💬</span>
                </div>
                {activeChatters > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full border-2 border-[#0a0a1a] animate-pulse" />
                )}
              </div>
            </motion.button>
          )}

          {/* Overlay Chat Desktop */}
          <AnimatePresence>
            {chatOpen && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setChatOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="relative w-full max-w-5xl h-[85vh] bg-[#050510] border border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-7 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <span className="text-2xl">💬</span>
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Canal de Sincronización</h2>
                        {activeChatters > 0 && (
                          <span className="text-[9px] font-black text-cyan-400 mt-2 block uppercase tracking-tighter">
                            {activeChatters} Pilotos en frecuencia activa · LIVE 🔴
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <GlobalChatPage />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {dailyFlash && (
        <div className="dailyBonusToast">
          🎁 ¡+30 Starlys! Bonus diario
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="gardenMobileNav">
        <NavLink to="/posts" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`} end>
          <span className="mobileNavIcon icon-pulse">🌌</span>
          <span className="mobileNavLabel">Feed</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <div className="relative">
            <span className="mobileNavIcon">💬</span>
            {activeChatters > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse border-2 border-[#050510]" />}
          </div>
          <span className="mobileNavLabel">Chat {activeChatters > 0 && <span className="text-[7px] text-cyan-400 ml-0.5">●</span>}</span>
        </NavLink>
        <NavLink to="/games" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon icon-spin-slow">🎮</span>
          <span className="mobileNavLabel">Juegos</span>
        </NavLink>
        <NavLink to="/tienda" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon icon-float">🛍️</span>
          <span className="mobileNavLabel">Tienda</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon">👤</span>
          <span className="mobileNavLabel">Perfil</span>
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`mobileNavLink ${mobileMenuOpen ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span className="mobileNavIcon text-[20px] mb-[-4px]">≡</span>
          <span className="mobileNavLabel">Más</span>
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hubOverlay"
          >
            <div className="hubContainer">
              <div className="hubHeader">
                <div className="hubTitle">Explorar Sistema</div>
                <button className="hubClose" onClick={closeMenu}>✕</button>
              </div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="hubUserCard"
              >
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={ownProfile?.avatar_url || '/default-avatar.png'}
                    alt=""
                    className="hubAvatar"
                  />
                  <div className="hubUserDetails">
                    <div className="hubUserName flex items-center gap-2">
                      {ownProfile?.display_name || user?.email?.split('@')[0] || 'Viajero'}
                      {ownProfile?.is_stellar_citizen && <span title="Ciudadano Estelar" className="text-amber-400">👑</span>}
                    </div>
                    <div className="hubUserLevel">Nivel Estelar {ownProfile?.level || 1}</div>
                  </div>
                </div>
                <div className="hubUserActions">
                  <NotificationBell />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="hubStats"
              >
                <div className="hubStatItem">
                  <span className="hubStatLabel">Starlys</span>
                  <StarlysCounter value={balance} className="hubStatValue text-amber-400" />
                </div>
              </motion.div>

              <motion.div
                variants={{
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } }
                }}
                initial="hidden"
                animate="show"
                className="hubGrid"
              >
                {[
                  { to: '/tienda-galactica', icon: '💎', label: 'Tienda Galáctica', className: 'hub-item-premium' },
                  { to: '/posts', icon: '🌌', label: 'Feed Social' },
                  { to: '/chat', icon: '💬', label: 'Chat Global', badge: activeChatters > 0 ? `${activeChatters} Activos` : null, isLive: activeChatters > 0 },
                  { to: '/bulletin', icon: '📰', label: 'Noticias' },
                  { to: '/logros', icon: '🏆', label: 'Logros' },
                  { to: '/leaderboard', icon: '🌎', label: 'Rankings' },
                  { to: '/cartas', icon: '✉️', label: 'Mensajes' },
                  { to: '/cabina', icon: '🚀', label: 'Cabina' },
                  { to: '/guestbook', icon: '📖', label: 'Libro' },
                  { to: '/arquitectura', icon: '🏗️', label: 'Arquitectura' },
                  { to: '/banco', icon: '🏦', label: 'Banco' },
                  !isNative && { to: '/desktop', icon: '💻', label: 'Desktop' },
                ].filter(Boolean).map((item) => (
                  <motion.div
                    key={item.to}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8, y: 20 },
                      show: { opacity: 1, scale: 1, y: 0 }
                    }}
                  >
                    <NavLink to={item.to} onClick={closeMenu} className={`hubItem ${item.className || ''} relative`}>
                      <span className="hubItemIcon">{item.icon}</span>
                      <span className="hubItemLabel">{item.label}</span>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 bg-cyan-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-[#0a0a1a]">
                          {item.badge}
                        </span>
                      )}
                      {item.isLive && (
                        <span className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-12 pb-6 text-center opacity-10 text-[7px] font-black uppercase tracking-[1em] text-white">
                Sincronización Estelar v2.5
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
