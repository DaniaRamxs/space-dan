import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from "react-router-dom";
import CursorTrail   from "../components/CursorTrail.jsx";
import StarfieldBg   from "../components/StarfieldBg.jsx";
import KonamiEasterEgg from "../components/KonamiEasterEgg.jsx";
import LastFmWidget  from "../components/LastFmWidget.jsx";
import RadioPlayer   from "../components/RadioPlayer.jsx";
import useDancoins   from "../hooks/useDancoins.js";

const PERSONAL_PATHS = ['/kinnies', '/tests', '/universo', '/dreamscape'];

export default function GardenLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(
    PERSONAL_PATHS.some(p => location.pathname.startsWith(p))
  );
  const { coins, claimDailyBonus, canClaimDaily } = useDancoins();
  const [dailyFlash, setDailyFlash] = useState(false);

  const closeMenu = () => setSidebarOpen(false);

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
    const claimed = claimDailyBonus();
    if (claimed) {
      setDailyFlash(true);
      setTimeout(() => setDailyFlash(false), 3000);
    }
  }, []);

  return (
    <div className="gardenPage">
      <StarfieldBg />
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
            <span className="dancoinsAmount">{coins}</span>
            <span className="dancoinsLabel">Dancoins</span>
          </div>

          <div className="sideHeaderDivider" aria-hidden="true" />

          {/* Last.fm */}
          <LastFmWidget />

          <nav className="sideNav">
            <NavLink to="/home"         onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🏠 sobre mi</NavLink>
            <NavLink to="/bulletin"     onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>📰 Noticias</NavLink>
            <NavLink to="/posts"        onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>✍️ Posts</NavLink>
            <NavLink to="/music"        onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🎧 Música</NavLink>
            <NavLink to="/games"        onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🎮 Juegos</NavLink>
            <NavLink to="/galeria"      onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🖼️ Galería</NavLink>
            <NavLink to="/watchlist"    onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>📺 Watchlist</NavLink>
            <NavLink to="/desktop"      onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>💻 OS Desktop</NavLink>
            <NavLink to="/timecapsule"  onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>⏳ Time Capsule</NavLink>
            <NavLink to="/guestbook"    onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>📖 Libro de Visitas</NavLink>
            <NavLink to="/proyectos"    onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🛠️ Proyectos</NavLink>
            <NavLink to="/arquitectura" onClick={closeMenu} className={({ isActive }) => "sideLink" + (isActive ? " active" : "")}>🏗️ Arquitectura</NavLink>

            <div className="sideHeaderDivider" aria-hidden="true" />

            {/* Game system links */}
            <NavLink to="/logros" onClick={closeMenu} className={({ isActive }) => "sideLink sideGameLink" + (isActive ? " active" : "")}>🏆 Logros</NavLink>
            <NavLink to="/tienda" onClick={closeMenu} className={({ isActive }) => "sideLink sideGameLink" + (isActive ? " active" : "")}>🛍️ Tienda</NavLink>

            <div className="sideHeaderDivider" aria-hidden="true" />

            {/* Submenú Personal */}
            <button
              className={`sideLink sideSubmenuToggle${PERSONAL_PATHS.some(p => location.pathname.startsWith(p)) ? ' active' : ''}`}
              onClick={() => setPersonalOpen(o => !o)}
              aria-expanded={personalOpen}
            >
              <span>✦ Personal</span>
              <span className={`submenuArrow${personalOpen ? ' open' : ''}`}>▾</span>
            </button>
            <div className={`submenuItems${personalOpen ? ' open' : ''}`}>
              <NavLink to="/kinnies"   onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌟 Kinnies</NavLink>
              <NavLink to="/tests"     onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🧪 Tests</NavLink>
              <NavLink to="/universo"  onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌌 Universo</NavLink>
              <NavLink to="/dreamscape"onClick={closeMenu} className={({ isActive }) => "sideLink submenuLink" + (isActive ? " active" : "")}>🌙 Dreamscape</NavLink>
            </div>
          </nav>
        </aside>

        <main className="gardenMain">
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

            {/* Dancoins in topbar (mobile) */}
            <div className="topbarCoins" aria-label="Dancoins">
              <NavLink to="/tienda" className="topbarCoinsLink">◈ {coins}</NavLink>
            </div>
          </header>

          <div className="gardenContent">{children}</div>

          {/* Snowflakes decorativos */}
          <div className="snowflakes" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="snowflake" key={i}>
                <img src="https://img1.picmix.com/output/stamp/thumb/3/3/0/6/2566033_52dfe.gif" alt="" />
              </div>
            ))}
          </div>
        </main>

        {/* Floating kitty */}
        <a href="https://alturl.com/p749b" target="_blank" rel="noopener noreferrer" className="floatingKitty">
          <img src="https://autism.crd.co/assets/images/gallery03/45050ba7_original.gif?v=69d6a439" alt="gato flotante" width={100} height={100} loading="lazy" />
        </a>

        {/* Portal secreto */}
        <div className="floatingImages" style={{ zIndex: 100, pointerEvents: 'none' }}>
          <Link to="/secret" className="floatImg img1" style={{ pointerEvents: 'auto', cursor: 'pointer', display: 'inline-block', width: '50px', height: '50px', lineHeight: 0 }}>
            <img src="/gifs/swirly.gif" alt="" style={{ width: '50px', height: '50px', display: 'block' }} />
          </Link>
        </div>
      </div>

      {/* Daily bonus toast */}
      {dailyFlash && (
        <div className="dailyBonusToast">
          🎁 ¡+30 Dancoins! Bonus diario
        </div>
      )}
    </div>
  );
}
