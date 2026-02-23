import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import "./styles.css";
import AchievementToast from "./components/AchievementToast";
import Screensaver from "./components/Screensaver";
import PageTransition from "./components/PageTransition";
import { unlockAchievement } from "./hooks/useAchievements";
import { trackPageVisit } from "./hooks/useDancoins";
import { applyTheme } from "./hooks/useTheme";
import { useEconomy } from "./contexts/EconomyContext";
import { AuthProvider } from "./contexts/AuthContext";
import { EconomyProvider } from "./contexts/EconomyContext";

const PostsPage = lazy(() => import("./pages/PostsPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const GlobalLeaderboardPage = lazy(() => import("./pages/GlobalLeaderboardPage"));
const Wpage = lazy(() => import("./pages/Wpage"));
const GardenLayout = lazy(() => import("./layouts/GardenLayout"));
const DanProfilePage = lazy(() => import("./pages/DanProfilePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
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
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const SpaceCabinPage = lazy(() => import("./pages/SpaceCabinPage"));
const OrbitLettersPage = lazy(() => import("./pages/OrbitLettersPage"));
const VaultPage = lazy(() => import("./pages/VaultPage"));
const FocusRoom = lazy(() => import("./pages/FocusRoom"));

const ALL_PAGES = ['/home', '/bulletin', '/posts', '/music', '/games', '/galeria',
  '/watchlist', '/desktop', '/timecapsule', '/guestbook', '/proyectos', '/arquitectura',
  '/kinnies', '/tests', '/universo', '/dreamscape', '/logros', '/tienda', '/profile', '/leaderboard', '/cabina', '/cartas', '/cofre', '/foco'];

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

function FallbackLoader() {
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#050510" }}>
      <span className="blinkText" style={{ color: "var(--accent)" }}>cargando_datos...</span>
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

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Wpage /></PageTransition>} />
        <Route path="/home" element={<Layout><DanProfilePage /></Layout>} />
        <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        <Route path="/profile/:userId" element={<Layout><PublicProfilePage /></Layout>} />
        <Route path="/bulletin" element={<Layout><BulletinPage /></Layout>} />
        <Route path="/posts" element={<Layout><PostsPage /></Layout>} />
        <Route path="/posts/:id" element={<Layout><PostPage /></Layout>} />
        <Route path="/music" element={<Layout><MusicPage /></Layout>} />
        <Route path="/games" element={<Layout><GamesPage /></Layout>} />
        <Route path="/leaderboard" element={<Layout><GlobalLeaderboardPage /></Layout>} />
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
        <Route path="/logros" element={<Layout><AchievementsPage /></Layout>} />
        <Route path="/tienda" element={<Layout><ShopPage /></Layout>} />
        <Route path="/cabina" element={<Layout><SpaceCabinPage /></Layout>} />
        <Route path="/cartas" element={<Layout><OrbitLettersPage /></Layout>} />
        <Route path="/cofre" element={<Layout><VaultPage /></Layout>} />
        <Route path="/foco/:roomId" element={<Layout><FocusRoom /></Layout>} />
        <Route path="/secret" element={<PageTransition><Secret /></PageTransition>} />
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
    return () => window.removeEventListener('dan:item-equipped', onEquip);
  }, []);

  return (
    <AuthProvider>
      <EconomyProvider>
        <BrowserRouter>
          <AchievementToast />
          <Screensaver />
          <PageTracker />
          <Suspense fallback={<FallbackLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </EconomyProvider>
    </AuthProvider>
  );
}
