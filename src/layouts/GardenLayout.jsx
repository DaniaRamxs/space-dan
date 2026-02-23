import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from "react-router-dom";
import CursorTrail from "../components/CursorTrail.jsx";
import StarfieldBg from "../components/StarfieldBg.jsx";
import KonamiEasterEgg from "../components/KonamiEasterEgg.jsx";
import LastFmWidget from "../components/LastFmWidget.jsx";
import RadioPlayer from "../components/RadioPlayer.jsx";
import AuthWidget from "../components/AuthWidget.jsx";
import { useEconomy } from '../contexts/EconomyContext';
import NotificationBell from "../components/NotificationBell.jsx";
import VirtualPet from "../components/VirtualPet.jsx";
import AmbientOrbs from "../components/AmbientOrbs.jsx";

const PERSONAL_PATHS = ['/kinnies', '/tests', '/universo', '/dreamscape'];
const FIXED_LAYOUT_PATHS = ['/cartas', '/cabina', '/desktop'];

export default function GardenLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuStates, setMenuStates] = useState({
    entertainment: false,
    content: false,
    community: false,
    productivity: true,
    personal: PERSONAL_PATHS.some(p => location.pathname.startsWith(p))
  });

  const toggleMenu = (key) => setMenuStates(prev => ({ ...prev, [key]: !prev[key] }));
  const closeMenu = () => setSidebarOpen(false);

  // Auto-open active categories
  useEffect(() => {
    const path = location.pathname;
    const updates = {};
    if (['/games', '/desktop', '/music', '/watchlist'].some(p => path.startsWith(p))) updates.entertainment = true;
    if (['/posts', '/bulletin', '/galeria', '/proyectos', '/arquitectura', '/timecapsule'].some(p => path.startsWith(p))) updates.content = true;
    if (['/leaderboard', '/logros', '/tienda', '/guestbook', '/cartas'].some(p => path.startsWith(p))) updates.community = true;
    if (['/cabina'].some(p => path.startsWith(p))) updates.productivity = true;
    if (PERSONAL_PATHS.some(p => path.startsWith(p))) updates.personal = true;

    if (Object.keys(updates).length > 0) {
      setMenuStates(prev => ({ ...prev, ...updates }));
    }
  }, [location.pathname]);

  const { balance, claimDaily, canClaimDaily } = useEconomy();
  const [dailyFlash, setDailyFlash] = useState(false);

  // Contador de visitas real
  const [visits, setVisits] = useState('------');
  useEffect(() => {
    fetch('https://api.counterapi.dev/v1/space-dan.netlify/visits/up')
      .then(r => r.json())
      .then(data => setVisits(String(data.count).padStart(6, '0')))
      .catch(() => setVisits('??????'));
  }, []);

  // Daily bonus on first visit of the day
  useEffect(() => {
    async function checkDaily() {
      if (canClaimDaily && canClaimDaily()) {
        try {
          const res = await claimDaily();
          if (res?.success) {
            setDailyFlash(true);
            setTimeout(() => setDailyFlash(false), 3000);
          }
        } catch (e) {
          // Ya reclamado o error
        }
      }
    }
    checkDaily();
  }, [claimDaily, canClaimDaily]);

  return (
    <div className="gardenPage">
      <StarfieldBg />
      <AmbientOrbs />
      <CursorTrail />
      <KonamiEasterEgg />
      <RadioPlayer />

      {/* Overlay para cerrar el menu en mobile */}
      {sidebarOpen && (
        <div className="sidebarOverlay" onClick={closeMenu} aria-hidden="true" />
      )}

      <div className="gardenShell">
        <aside className={`gardenSidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sideHeader">
            <div className="sideTitle">space-dan</div>
          </div>

          <div className="sideHeaderDivider" aria-hidden="true" />

          {/* Visit counter */}
          <div className="visitCounter" aria-label="Contador de visitas">
            <span className="visitLabel">visitas</span>
            <span className="visitNumber">{String(visits).padStart(6, '0')}</span>
          </div>

          {/* Dancoins */}
          <div className={`dancoinsWidget${dailyFlash ? ' flash' : ''}`}>
            <span className="dancoinsIcon">◈</span>
            <span className="dancoinsAmount">{balance}</span>
            <span className="dancoinsLabel">Dancoins</span>
          </div>

          <AuthWidget />

          <div className="sideHeaderDivider" aria-hidden="true" />

          {/* Last.fm */}
          <LastFmWidget />

          <nav className="sideNav">
            <div className="sideNavGroup">
              <NavLink to="/profile" onClick={closeMenu} className={({ isActive }) => "sideLink topLevel" + (isActive ? " active" : "")}>👤 Mi Perfil</NavLink>
              <NavLink to="/home" onClick={closeMenu} className={({ isActive }) => "sideLink topLevel" + (isActive ? " active" : "")}>🏠 Sobre Dan</NavLink>
            </div>

            <div className="sideNavDivider" />

            {/* 🎮 Entretenimiento */}
            <div className="sideSubmenuWrap">
              <button className={`sideLink submenuToggle ${menuStates.entertainment ? 'open' : ''}`} onClick={() => toggleMenu('entertainment')}>
                <span>🎮 Entretenimiento</span>
                <span className="submenuArrow">▾</span>
              </button>
              <div className={`submenuItems ${menuStates.entertainment ? 'open' : ''}`}>
                <NavLink to="/games" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🎮 Juegos</NavLink>
                <NavLink to="/desktop" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>💻 OS Desktop</NavLink>
                <NavLink to="/music" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🎧 Música</NavLink>
                <NavLink to="/watchlist" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>📺 Watchlist</NavLink>
              </div>
            </div>

            {/* 📝 Contenido */}
            <div className="sideSubmenuWrap">
              <button className={`sideLink submenuToggle ${menuStates.content ? 'open' : ''}`} onClick={() => toggleMenu('content')}>
                <span>📝 Contenido</span>
                <span className="submenuArrow">▾</span>
              </button>
              <div className={`submenuItems ${menuStates.content ? 'open' : ''}`}>
                <NavLink to="/bulletin" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>📰 Noticias</NavLink>
                <NavLink to="/posts" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>✍️ Posts</NavLink>
                <NavLink to="/galeria" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🖼️ Galería</NavLink>
                <NavLink to="/proyectos" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🛠️ Proyectos</NavLink>
                <NavLink to="/arquitectura" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🏗️ Arquitectura</NavLink>
                <NavLink to="/timecapsule" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>⏳ Time Capsule</NavLink>
              </div>
            </div>

            {/* 🏆 Comunidad */}
            <div className="sideSubmenuWrap">
              <button className={`sideLink submenuToggle ${menuStates.community ? 'open' : ''}`} onClick={() => toggleMenu('community')}>
                <span>🏆 Comunidad</span>
                <span className="submenuArrow">▾</span>
              </button>
              <div className={`submenuItems ${menuStates.community ? 'open' : ''}`}>
                <NavLink to="/leaderboard" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌎 Leaderboard</NavLink>
                <NavLink to="/cartas" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>✉️ Cartas en Órbita</NavLink>
                <NavLink to="/guestbook" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>📖 Libro de Visitas</NavLink>
                <NavLink to="/logros" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🏆 Logros</NavLink>
                <NavLink to="/tienda" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🛍️ Tienda</NavLink>
              </div>
            </div>

            {/* 📚 Productividad */}
            <div className="sideSubmenuWrap">
              <button className={`sideLink submenuToggle ${menuStates.productivity ? 'open' : ''}`} onClick={() => toggleMenu('productivity')}>
                <span>📚 Productividad</span>
                <span className="submenuArrow">▾</span>
              </button>
              <div className={`submenuItems ${menuStates.productivity ? 'open' : ''}`}>
                <NavLink to="/cabina" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🚀 Cabina Espacial</NavLink>
              </div>
            </div>

            <div className="sideNavDivider" />

            {/* ✦ Personal */}
            <div className="sideSubmenuWrap">
              <button className={`sideLink submenuToggle ${menuStates.personal ? 'open' : ''}`} onClick={() => toggleMenu('personal')}>
                <span>✦ Personal</span>
                <span className="submenuArrow">▾</span>
              </button>
              <div className={`submenuItems ${menuStates.personal ? 'open' : ''}`}>
                <NavLink to="/kinnies" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌟 Kinnies</NavLink>
                <NavLink to="/tests" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🧪 Tests</NavLink>
                <NavLink to="/universo" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌌 Universo</NavLink>
                <NavLink to="/dreamscape" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌙 Dreamscape</NavLink>
                <NavLink to="/cofre" onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🔒 Cofre Privado</NavLink>
              </div>
            </div>
          </nav>
        </aside>

        <main
          className={`gardenMain ${FIXED_LAYOUT_PATHS.some(p => location.pathname.startsWith(p)) ? 'gardenMain--fixed' : 'gardenMain--scrollable'}`}
          style={FIXED_LAYOUT_PATHS.some(p => location.pathname.startsWith(p)) ? { height: 'calc(100dvh - 60px)', display: 'flex', flexDirection: 'column' } : {}}
        >
          <header className="gardenTopbar">
            <button
              className={`hamburger${sidebarOpen ? ' is-open' : ''}`}
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
            >
              <span /><span /><span />
            </button>

            <div className="welcomeColumn">
              <img src="/gifs/rainbowstars.gif" alt="" className="welcomeGif" aria-hidden="true" />
              <div className="welcomeText">bienvenid@ al dan-space</div>
              <img src="/gifs/rainbowstars.gif" alt="" className="welcomeGif" aria-hidden="true" />
            </div>

            <div className="topbarCoins" aria-label="Dancoins" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <NavLink to="/tienda" className="topbarCoinsLink">◈ {balance}</NavLink>
              <NotificationBell />
            </div>
          </header>

          <div className="gardenContent" style={FIXED_LAYOUT_PATHS.some(p => location.pathname.startsWith(p)) ? { flex: 1, overflow: 'hidden', padding: 0 } : {}}>{children}</div>

          {location.pathname !== '/cabina' && <VirtualPet />}

          <div className="snowflakes" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="snowflake" key={i}>
                <img src="https://img1.picmix.com/output/stamp/thumb/3/3/0/6/2566033_52dfe.gif" alt="" />
              </div>
            ))}
          </div>
        </main>


      </div>

      {dailyFlash && (
        <div className="dailyBonusToast">
          🎁 ¡+30 Dancoins! Bonus diario
        </div>
      )}
    </div>
  );
}
