import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./styles.css";
import AchievementToast from "./components/AchievementToast";
import Screensaver      from "./components/Screensaver";
import { unlockAchievement } from "./hooks/useAchievements";
import { trackPageVisit }    from "./hooks/useDancoins";
import { applyTheme }        from "./hooks/useTheme";
import { AuthProvider }      from "./contexts/AuthContext";

const PostsPage       = lazy(() => import("./pages/PostsPage"));
const PostPage        = lazy(() => import("./pages/PostPage"));
const MusicPage       = lazy(() => import("./pages/MusicPage"));
const GamesPage       = lazy(() => import("./pages/GamesPage"));
const Wpage           = lazy(() => import("./pages/Wpage"));
const GardenLayout    = lazy(() => import("./layouts/GardenLayout"));
const ProfilePage     = lazy(() => import("./pages/ProfilePage"));
const BulletinPage    = lazy(() => import("./pages/BulletinPage"));
const Secret          = lazy(() => import("./pages/Secret"));
const KinniesPage     = lazy(() => import("./pages/KinniesPage"));
const TestsPage       = lazy(() => import("./pages/TestsPage"));
const GalleryPage     = lazy(() => import("./pages/GalleryPage"));
const WatchlistPage   = lazy(() => import("./pages/WatchlistPage"));
const UniversoPage    = lazy(() => import("./pages/UniversoPage"));
const DesktopPage     = lazy(() => import("./pages/DesktopPage"));
const DreamscapePage  = lazy(() => import("./pages/DreamscapePage"));
const TimeCapsulePage = lazy(() => import("./pages/TimeCapsulePage"));
const GuestbookPage   = lazy(() => import("./pages/GuestbookPage"));
const ArquitecturaPage= lazy(() => import("./pages/ArquitecturaPage"));
const ProjectsPage    = lazy(() => import("./pages/ProjectsPage"));
const AchievementsPage= lazy(() => import("./pages/AchievementsPage"));
const ShopPage        = lazy(() => import("./pages/ShopPage"));

const ALL_PAGES = ['/home','/bulletin','/posts','/music','/games','/galeria',
  '/watchlist','/desktop','/timecapsule','/guestbook','/proyectos','/arquitectura',
  '/kinnies','/tests','/universo','/dreamscape','/logros','/tienda'];

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    // Track visit & achievements
    const { total } = trackPageVisit(path);
    if (total >= 1)  unlockAchievement('first_visit');
    if (total >= 10) unlockAchievement('explorer');
    const visited = JSON.parse(localStorage.getItem('space-dan-visited-pages') || '[]');
    if (ALL_PAGES.every(p => visited.includes(p))) unlockAchievement('completionist');

    // Specific page achievements
    if (path === '/music')       unlockAchievement('music_lover');
    if (path === '/timecapsule') unlockAchievement('capsule_opener');
    if (path === '/secret')      unlockAchievement('secret_finder');

    // Night owl
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, [location.pathname]);
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
      <Suspense fallback={null}>{children}</Suspense>
    </GardenLayout>
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
    <BrowserRouter>
      <AchievementToast />
      <Screensaver />
      <PageTracker />
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          <Route path="/"             element={<Wpage />} />
          <Route path="/home"         element={<Layout><ProfilePage /></Layout>} />
          <Route path="/bulletin"     element={<Layout><BulletinPage /></Layout>} />
          <Route path="/posts"        element={<Layout><PostsPage /></Layout>} />
          <Route path="/posts/:id"    element={<Layout><PostPage /></Layout>} />
          <Route path="/music"        element={<Layout><MusicPage /></Layout>} />
          <Route path="/games"        element={<Layout><GamesPage /></Layout>} />
          <Route path="/kinnies"      element={<Layout><KinniesPage /></Layout>} />
          <Route path="/tests"        element={<Layout><TestsPage /></Layout>} />
          <Route path="/galeria"      element={<Layout><GalleryPage /></Layout>} />
          <Route path="/watchlist"    element={<Layout><WatchlistPage /></Layout>} />
          <Route path="/universo"     element={<Layout><UniversoPage /></Layout>} />
          <Route path="/desktop"      element={<Suspense fallback={null}><DesktopPage /></Suspense>} />
          <Route path="/dreamscape"   element={<Suspense fallback={null}><DreamscapePage /></Suspense>} />
          <Route path="/timecapsule"  element={<Suspense fallback={null}><TimeCapsulePage /></Suspense>} />
          <Route path="/guestbook"    element={<Layout><GuestbookPage /></Layout>} />
          <Route path="/arquitectura" element={<Layout><ArquitecturaPage /></Layout>} />
          <Route path="/proyectos"    element={<Layout><ProjectsPage /></Layout>} />
          <Route path="/logros"       element={<Layout><AchievementsPage /></Layout>} />
          <Route path="/tienda"       element={<Layout><ShopPage /></Layout>} />
          <Route path="/secret"       element={<Secret />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}
