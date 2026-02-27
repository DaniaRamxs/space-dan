import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import { AnimatePresence } from "framer-motion";
import "./styles.css";
import "./banner-effects.css";
import "./styles/NicknameStyles.css";
import AchievementToast from "./components/AchievementToast";
import Screensaver from "./components/Screensaver";
import PageTransition from "./components/PageTransition";
import { unlockAchievement } from "./hooks/useAchievements";
import { trackPageVisit } from "./hooks/useDancoins";
import { applyTheme } from "./hooks/useTheme";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { EconomyProvider, useEconomy } from "./contexts/EconomyContext";
import { UniverseProvider } from "./contexts/UniverseContext.jsx";



const PostsPage = lazy(() => import("./pages/PostsPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const GlobalLeaderboardPage = lazy(() => import("./pages/GlobalLeaderboardPage"));
// const Wpage = lazy(() => import("./pages/Wpage"));
const GardenLayout = lazy(() => import("./layouts/GardenLayout"));
const DanProfilePage = lazy(() => import("./pages/DanProfilePage"));
// const ProfilePage represents ProfileRouter already
const BulletinPage = lazy(() => import("./pages/BulletinPage"));
const Secret = lazy(() => import("./pages/Secret"));
const KinniesPage = lazy(() => import("./pages/KinniesPage"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const UniversoPage = lazy(() => import("./pages/UniversoPage"));
const DesktopPage = lazy(() => import("./pages/DesktopPage"));
const DreamscapePage = lazy(() => import("./pages/DreamscapePage"));
const TimeCapsulePage = lazy(() => import("./pages/TimeCapsulePage"));
const GuestbookPage = lazy(() => import("./pages/GuestbookPage"));
const ArquitecturaPage = lazy(() => import("./pages/ArquitecturaPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProfileOwn = lazy(() => import("./pages/Profile/ProfileOwn"));
const ProfilePublic = lazy(() => import("./pages/Profile/ProfilePublic"));
const SpaceCabinPage = lazy(() => import("./pages/SpaceCabinPage"));
const OrbitLettersPage = lazy(() => import("./pages/OrbitLettersPage"));
const VaultPage = lazy(() => import("./pages/VaultPage"));
const FocusRoom = lazy(() => import("./pages/FocusRoom"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const VinculosPage = lazy(() => import("./pages/VinculosPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const GlobalChatPage = lazy(() => import("./pages/GlobalChatPage"));



const ALL_PAGES = ['/dan', '/bulletin', '/posts', '/music', '/games', '/galeria',
  '/watchlist', '/desktop', '/timecapsule', '/guestbook', '/proyectos', '/arquitectura',
  '/kinnies', '/tests', '/universo', '/dreamscape', '/logros', '/tienda', '/profile', '/leaderboard', '/cabina', '/cartas', '/cofre', '/foco', '/chat'];

function PageTracker() {
  const location = useLocation();
  const { awardCoins } = useEconomy();
  useEffect(() => {
    const path = location.pathname;
    // Track visit & award coins via Supabase on first visit (no-op for guests)
    const { isNew, total } = trackPageVisit(path);
    if (isNew) awardCoins(5, 'page_visit', path);

    if (total >= 1) unlockAchievement('first_visit');
    if (total >= 10) unlockAchievement('explorer');
    const visited = JSON.parse(localStorage.getItem('space-dan-visited-pages') || '[]');
    if (ALL_PAGES.every(p => visited.includes(p))) unlockAchievement('completionist');

    // Specific page achievements
    if (path === '/music') unlockAchievement('music_lover');
    if (path === '/timecapsule') unlockAchievement('capsule_opener');
    if (path === '/secret') unlockAchievement('secret_finder');

    // Night owl
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, [location.pathname, awardCoins]);
  return null;
}

function PresenceTracker() {
  const location = useLocation();
  const { updatePresence, activeStation } = useUniverse();
  const { profile } = useAuthContext();

  useEffect(() => {
    if (!profile) return;

    const getStatus = () => {
      if (activeStation) return `SINTONIZANDO: ${activeStation} 🎵`;

      const path = location.pathname;
      if (path === '/chat') return 'EN EL CHAT GLOBAL 💬';
      if (path === '/cabina') return 'EN LA CABINA DE MANDO 🚀';
      if (path === '/desktop') return 'OPERANDO SPACE-OS 💻';
      if (path === '/tienda') return 'EN EL MERCADO ESTELAR 🛍️';
      if (path === '/games') return 'EN EL SECTOR DE JUEGOS 🎮';
      if (path === '/universo') return 'OBSERVANDO EL COSMOS 🌌';
      return 'NAVEGANDO EL SISTEMA';
    };

    updatePresence({ status: getStatus() });
  }, [location.pathname, profile, updatePresence, activeStation]);

  return null;
}

function FallbackLoader() {
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#050510" }}>
      <span className="blinkText" style={{ color: "var(--accent)" }}>cargando_datos...</span>
    </div>
  );
}

function LoginGate({ message = "Necesitas iniciar sesión para ver esta sección." }) {
  const { loginWithGoogle, loginWithDiscord } = useAuthContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="relative">
        <div className="absolute -inset-8 bg-cyan-500/10 blur-3xl rounded-full"></div>
        <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-10 max-w-sm shadow-2xl">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-white tracking-wide mb-2">Acceso Requerido</h2>
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={loginWithGoogle}
              className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 rounded-xl text-sm font-bold text-white/80 hover:text-white transition-all flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Iniciar con Google
            </button>
            <button
              onClick={loginWithDiscord}
              className="w-full py-3 px-6 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 hover:border-[#5865F2]/50 rounded-xl text-sm font-bold text-white/80 hover:text-white transition-all flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
              Iniciar con Discord
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-5 tracking-wider uppercase">Space Dan · Perfil Estelar</p>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <GardenLayout>
      <Suspense fallback={null}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </GardenLayout>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { user, profile, loading } = useAuthContext();

  // Redirección obligatoria a onboarding si no tiene username 
  // Solo si estamos autenticados y NO estamos ya en la página de onboarding o landing
  const isOnboardingPath = location.pathname === '/onboarding';
  const isLandingPath = location.pathname === '/';

  if (!loading && user && !profile?.username && !isOnboardingPath && !isLandingPath) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Onboarding Route */}
        <Route path="/onboarding" element={<Layout><OnboardingPage /></Layout>} />


        <Route
          path="/"
          element={
            window.location.hash || window.location.search.includes('code=')
              ? <FallbackLoader />
              : <Navigate to="/posts" replace />
          }
        />
        <Route path="/dan" element={<Layout><DanProfilePage /></Layout>} />
        <Route path="/profile" element={
          loading ? <FallbackLoader /> : (user ? <Layout><ProfileOwn /></Layout> : <Layout><LoginGate message="Necesitas iniciar sesión para ver tu perfil estelar." /></Layout>)
        } />
        <Route path="/bulletin" element={<Layout><BulletinPage /></Layout>} />
        <Route path="/posts" element={
          loading ? <FallbackLoader /> : (user ? <Layout><PostsPage /></Layout> : <Layout><LoginGate message="Necesitas iniciar sesión para participar en la comunidad." /></Layout>)
        } />
        <Route path="/transmission/:postId" element={<Layout><PostDetailPage /></Layout>} />
        <Route path="/log/:slug" element={<Layout><PostPage /></Layout>} />
        <Route path="/create-post" element={<Layout><CreatePostPage /></Layout>} />
        <Route path="/edit-post/:id" element={<Layout><CreatePostPage /></Layout>} />
        <Route path="/music" element={<Layout><MusicPage /></Layout>} />
        <Route path="/games" element={<Layout><GamesPage /></Layout>} />
        <Route path="/leaderboard" element={<Layout><GlobalLeaderboardPage /></Layout>} />
        <Route path="/chat" element={<Layout><GlobalChatPage /></Layout>} />
        <Route path="/kinnies" element={<Layout><KinniesPage /></Layout>} />
        <Route path="/tests" element={<Layout><TestsPage /></Layout>} />
        <Route path="/galeria" element={<Layout><GalleryPage /></Layout>} />
        <Route path="/watchlist" element={<Layout><WatchlistPage /></Layout>} />
        <Route path="/universo" element={<Layout><UniversoPage /></Layout>} />
        <Route path="/desktop" element={<Suspense fallback={null}><PageTransition><DesktopPage /></PageTransition></Suspense>} />
        <Route path="/dreamscape" element={<Suspense fallback={null}><PageTransition><DreamscapePage /></PageTransition></Suspense>} />
        <Route path="/timecapsule" element={<Suspense fallback={null}><PageTransition><TimeCapsulePage /></PageTransition></Suspense>} />
        <Route path="/guestbook" element={<Layout><GuestbookPage /></Layout>} />
        <Route path="/arquitectura" element={<Layout><ArquitecturaPage /></Layout>} />
        <Route path="/proyectos" element={<Layout><ProjectsPage /></Layout>} />
        <Route path="/profile/logros" element={<Layout><AchievementsPage /></Layout>} />
        <Route path="/tienda" element={<Layout><ShopPage /></Layout>} />
        <Route path="/cabina" element={<Layout><SpaceCabinPage /></Layout>} />

        <Route path="/cartas" element={
          loading ? <FallbackLoader /> : (user ? <Layout><OrbitLettersPage /></Layout> : <Layout><LoginGate message="Necesitas iniciar sesión para comunicarte con otros usuarios." /></Layout>)
        } />

        <Route path="/foco/:roomId" element={<Layout><FocusRoom /></Layout>} />
        <Route path="/profile/vinculos" element={<Layout><VinculosPage /></Layout>} />
        <Route path="/secret" element={<PageTransition><Secret /></PageTransition>} />
        {/* Dynamic Profile / 404 Catch-all */}
        <Route path="/:username" element={<Layout><ProfilePublic /></Layout>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const onEquip = (e) => {
      if (e.detail?.category === 'theme') applyTheme(e.detail.itemId || 'theme_default');
    };
    window.addEventListener('dan:item-equipped', onEquip);

    // Global drag-to-scroll logic for .mobile-scroll-x
    let activeEl = null;
    let startX = 0;
    let scrollLeft = 0;
    let isMoved = false;

    const onMouseDown = (e) => {
      const el = e.target.closest('.mobile-scroll-x');
      if (!el) return;
      activeEl = el;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      isMoved = false;
    };

    const onMouseMove = (e) => {
      if (!activeEl) return;
      const x = e.pageX - activeEl.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) {
        isMoved = true;
        activeEl.style.cursor = 'grabbing';
      }
      activeEl.scrollLeft = scrollLeft - walk;
    };

    const onMouseUp = () => {
      if (!activeEl) return;
      activeEl.style.cursor = '';
      if (isMoved) {
        const preventClick = (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();
          window.removeEventListener('click', preventClick, true);
        };
        window.addEventListener('click', preventClick, true);
      }
      activeEl = null;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('dan:item-equipped', onEquip);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <AuthProvider>
      <EconomyProvider>
        <UniverseProvider>
          <BrowserRouter>
            <AchievementToast />
            <Screensaver />
            <PageTracker />
            <PresenceTracker />
            <Suspense fallback={<FallbackLoader />}>
              <AnimatedRoutes />
            </Suspense>
          </BrowserRouter>
        </UniverseProvider>
      </EconomyProvider>
    </AuthProvider>
  );
}
