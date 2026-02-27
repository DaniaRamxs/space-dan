import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import CursorTrail from "../components/CursorTrail.jsx";
import StarfieldBg from "../components/StarfieldBg.jsx";
import KonamiEasterEgg from "../components/KonamiEasterEgg.jsx";

import RadioPlayer from "../components/RadioPlayer.jsx";
import AuthWidget from "../components/AuthWidget.jsx";
import { useEconomy } from '../contexts/EconomyContext';
import NotificationBell from "../components/NotificationBell.jsx";
import AmbientOrbs from "../components/AmbientOrbs.jsx";
import useAuth from '../hooks/useAuth';
import { useRef } from 'react';

const PERSONAL_PATHS = ['/kinnies', '/tests', '/universo', '/dreamscape'];
const FIXED_LAYOUT_PATHS = ['/cartas', '/cabina', '/desktop', '/posts'];



export default function GardenLayout({ children }) {
  const { user, profile: ownProfile } = useAuth();

  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Contador de visitas real
  const [visits, setVisits] = useState('------');
  useEffect(() => {
    fetch('https://api.counterapi.dev/v1/space-dan.netlify/visits/up')
      .then(r => r.json())
      .then(data => setVisits(String(data.count).padStart(6, '0')))
      .catch(() => setVisits('??????'));
  }, []);

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

  return (
    <div className={`gardenPage ${isFixedLayout ? 'gardenPage--fixed' : ''}`}>
      <StarfieldBg />
      <AmbientOrbs />
      <CursorTrail />
      <KonamiEasterEgg />
      <RadioPlayer />

      {/* Overlay para cerrar el menu en mobile */}
      <div className={`gardenShell ${isFixedLayout ? 'gardenShell--fixed' : ''}`}>

        <main className="gardenMain">
          <header className="gardenTopbar">
            <div className="topbarLeft">
              <div className="topbarLogo">
                SPACE-DAN <span className="text-cyan-500">OS</span>
              </div>

              <nav className="desktopNav hidden md:flex">
                <NavLink to="/posts" className="desktopNavLink">Social</NavLink>
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
                  <span className="statLabel">VSS</span>
                  <span className="statValue">{visits}</span>
                </div>
                <div className="statItem">
                  <span className="statLabel">DNC</span>
                  <span className="statValue">◈ {balance}</span>
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






        </main>


      </div>

      {dailyFlash && (
        <div className="dailyBonusToast">
          🎁 ¡+30 Dancoins! Bonus diario
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="gardenMobileNav">
        <NavLink to="/posts" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon">🌌</span>
          <span className="mobileNavLabel">Feed</span>
        </NavLink>
        <NavLink to="/games" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon">🎮</span>
          <span className="mobileNavLabel">Juegos</span>
        </NavLink>
        <NavLink to="/tienda" className={({ isActive }) => `mobileNavLink ${isActive ? 'active' : ''}`}>
          <span className="mobileNavIcon">🛍️</span>
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
          <span className="mobileNavIcon">≡</span>
          <span className="mobileNavLabel">Más</span>
        </button>
      </nav>

      {/* Modern Mobile HUB Overlay */}
      {/* Unified System HUB Overlay */}
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

              {/* User Card */}
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
                    <div className="hubUserName">{ownProfile?.display_name || user?.email?.split('@')[0] || 'Viajero'}</div>
                    <div className="hubUserLevel">Nivel Estelar {ownProfile?.level || 1}</div>
                  </div>
                </div>
                <div className="hubUserActions">
                  <NotificationBell />
                </div>
              </motion.div>


              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="hubStats"
              >
                <div className="hubStatItem">
                  <span className="hubStatLabel">Dancoins</span>
                  <span className="hubStatValue text-amber-400">◈ {balance}</span>
                </div>
                <div className="hubStatItem">
                  <span className="hubStatLabel">Visitas Globales</span>
                  <span className="hubStatValue text-cyan-400">{visits}</span>
                </div>
              </motion.div>

              {/* Grid Items */}
              <motion.div
                variants={{
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } }
                }}
                initial="hidden"
                animate="show"
                className="hubGrid"
              >
                {[
                  { to: '/bulletin', icon: '📰', label: 'Noticias' },
                  { to: '/chat', icon: '💬', label: 'Chat Global' },
                  { to: '/logros', icon: '🏆', label: 'Logros' },
                  { to: '/leaderboard', icon: '🌎', label: 'Rankings' },
                  { to: '/cartas', icon: '✉️', label: 'Mensajes' },
                  { to: '/cabina', icon: '🚀', label: 'Cabina' },
                  { to: '/guestbook', icon: '📖', label: 'Libro' },
                  { to: '/arquitectura', icon: '🏗️', label: 'Arquitectura' },
                  { to: '/desktop', icon: '💻', label: 'Desktop' },
                  { to: '/dan', icon: '👤', label: 'Sobre Dan' },
                ].map((item) => (
                  <motion.div
                    key={item.to}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8, y: 20 },
                      show: { opacity: 1, scale: 1, y: 0 }
                    }}
                  >
                    <NavLink to={item.to} onClick={closeMenu} className="hubItem">
                      <span className="hubItemIcon">{item.icon}</span>
                      <span className="hubItemLabel">{item.label}</span>
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
