import React, { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import "./styles.css";
import "./banner-effects.css";
import "./styles/NicknameStyles.css";
import AchievementToast from "./components/AchievementToast";
import BlackMarketNotification from "./components/Social/BlackMarketNotification";
import StellarOnboarding from "./components/Social/StellarOnboarding";
import StellarCalendar from "./components/Social/StellarCalendar";
import BadgePicker from "./components/Social/BadgePicker";
import PageTransition from "./components/PageTransition";
import ScrollToTop from "./components/ScrollToTop";
import RedemptionInvite from "./components/Social/RedemptionInvite";
import TycoonInvite from "./components/Social/TycoonInvite";
import { unlockAchievement } from "./hooks/useAchievements";
import { trackPageVisit } from "./hooks/useStarlys";
import { applyTheme } from "./hooks/useTheme";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { EconomyProvider, useEconomy } from "./contexts/EconomyContext";
import { UniverseProvider, useUniverse } from "./contexts/UniverseContext.jsx";
import { spotifyService } from "./services/spotifyService";
import CosmicEventBanner from "./components/Social/CosmicEventBanner";
import WelcomeExperience from "./components/WelcomeExperience";
import StarfieldBg from "./components/StarfieldBg";
import ClickRipple from "./components/ClickRipple";
import ActivityRadar from "./components/ActivityRadar";
import { CosmicProvider, useCosmic } from "./components/Effects/CosmicProvider";

// Lazy Pages
const PostsPage = lazy(() => import("./pages/PostsPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const GlobalLeaderboardPage = lazy(() => import("./pages/GlobalLeaderboardPage"));
const GardenLayout = lazy(() => import("./layouts/GardenLayout"));
const BulletinPage = lazy(() => import("./pages/BulletinPage"));
const Secret = lazy(() => import("./pages/Secret"));
const KinniesPage = lazy(() => import("./pages/KinniesPage"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const BankPage = lazy(() => import("./pages/BankPage"));
const BlackMarketPage = lazy(() => import("./pages/BlackMarketPage"));
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
const AffinityPage = lazy(() => import("./pages/AffinityPage"));
const StellarMap = lazy(() => import("./pages/StellarMap"));
const RedemptionZone = lazy(() => import("./pages/RedemptionZone"));
const TycoonDashboard = lazy(() => import("./pages/TycoonDashboard"));
const GalacticStore = lazy(() => import("./pages/GalacticStore"));
const StellarPassPage = lazy(() => import("./pages/StellarPassPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));

function DarkSideManager() {
  useEffect(() => {
    const checkDarkSide = () => {
      const h = new Date().getHours();
      const isDarkSide = h >= 0 && h < 5;
      if (isDarkSide) document.body.classList.add('the-dark-side');
      else document.body.classList.remove('the-dark-side');
    };
    checkDarkSide();
    const interval = setInterval(checkDarkSide, 60000);
    return () => clearInterval(interval);
  }, []);
  return null;
}

function PageTracker() {
  const location = useLocation();
  const { user } = useAuthContext();
  useEffect(() => {
    if (user) trackPageVisit(user.id, location.pathname);
  }, [location, user]);
  return null;
}

function DomainGuard() {
  return null; // Simplified reconstruction
}

function FallbackLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308] z-[9999]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

function PresenceTracker() {
  const location = useLocation();
  const { updatePresence, activeStation, isPresenceReady } = useUniverse();
  const { profile } = useAuthContext();
  const lastStatus = useRef('');

  useEffect(() => {
    if (!profile || !isPresenceReady || !updatePresence) return;
    const getBaseStatus = () => {
      const path = location.pathname;
      if (path === '/chat') return 'EN EL CHAT GLOBAL 💬';
      if (path === '/cabina') return 'EN LA CABINA DE MANDO 🚀';
      if (path === '/desktop') return 'OPERANDO SPACE-OS 💻';
      if (path === '/tienda') return 'EN EL MERCADO ESTELAR 🛍️';
      if (path === '/games') return 'EN EL SECTOR DE JUEGOS 🎮';
      if (path === '/universo') return 'OBSERVANDO EL COSMOS 🌌';
      if (path === '/explorar') return 'EXPLORANDO EL SISTEMA 🧭';
      if (path.startsWith('/@')) return 'MIRANDO UN PERFIL 👤';
      return 'NAVEGANDO POR SPACELY';
    };
    const activity = getBaseStatus();
    const finalStatus = activeStation ? `SINTONIZANDO: ${activeStation} 🎵 • ${activity}` : activity;
    if (finalStatus !== lastStatus.current) {
      updatePresence({ status: finalStatus }).then(s => { if (s !== false) lastStatus.current = finalStatus; });
    }
  }, [location.pathname, profile?.id, updatePresence, activeStation, isPresenceReady]);
  return null;
}

function MusicSyncTracker() {
  const { user } = useAuthContext();
  useEffect(() => {
    if (!user || window.location.pathname === '/spotify-callback') return;
    const interval = setInterval(() => spotifyService.syncCurrentSoundState(), 60000);
    return () => clearInterval(interval);
  }, [user]);
  return null;
}

function LoginGate({ message = "Necesitas iniciar sesión para ver esta sección." }) {
  const { loginWithGoogle, loginWithDiscord } = useAuthContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="relative p-10 bg-white/[0.02] border border-white/[0.08] rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-black text-white mb-2">Acceso Requerido</h2>
        <p className="text-sm text-white/40 mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button onClick={loginWithGoogle} className="w-full py-3 px-6 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-all">Google</button>
          <button onClick={loginWithDiscord} className="w-full py-3 px-6 bg-[#5865F2]/20 border border-[#5865F2]/30 rounded-xl text-sm font-bold text-white hover:bg-[#5865F2]/30 transition-all">Discord</button>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <GardenLayout>
      <Suspense fallback={<FallbackLoader />}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </GardenLayout>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { user, profile, loading, profileLoading } = useAuthContext();

  const isOnboardingPath = location.pathname === '/onboarding';
  const isLandingPath = location.pathname === '/';

  const shouldRedirectToOnboarding = !loading && !profileLoading && user && !profile?.username && !isOnboardingPath && !isLandingPath;
  const isAffinityPath = location.pathname === '/afinidad';
  const shouldRedirectToAffinity = !loading && !profileLoading && user && profile?.username && !profile?.affinity_completed && !isAffinityPath && !isLandingPath;

  if (shouldRedirectToOnboarding) return <Navigate to="/onboarding" replace />;
  if (shouldRedirectToAffinity) return <Navigate to="/afinidad" replace />;

  return (
    <AnimatePresence mode="popLayout">
      <Routes location={location} key={location.pathname}>
        <Route path="/onboarding" element={<Layout><OnboardingPage /></Layout>} />
        <Route path="/afinidad" element={<Layout><AffinityPage /></Layout>} />
        <Route path="/" element={<Navigate to="/posts" replace />} />
        <Route path="/explorar" element={<Layout><ExplorePage /></Layout>} />
        <Route path="/posts" element={user ? <Layout><PostsPage /></Layout> : <Layout><LoginGate /></Layout>} />
        <Route path="/transmission/:postId" element={<Layout><PostDetailPage /></Layout>} />
        <Route path="/bulletin" element={<Layout><BulletinPage /></Layout>} />
        <Route path="/games" element={<Layout><GamesPage /></Layout>} />
        <Route path="/game/:gameId" element={<Layout><GamesPage /></Layout>} />
        <Route path="/tienda" element={<Layout><ShopPage /></Layout>} />
        <Route path="/banco" element={<Layout><BankPage /></Layout>} />
        <Route path="/mercado-negro" element={<Layout><BlackMarketPage /></Layout>} />
        <Route path="/chat" element={<Layout><GlobalChatPage /></Layout>} />
        <Route path="/cabina" element={<Layout><SpaceCabinPage /></Layout>} />
        <Route path="/inventory" element={<Layout><InventoryPage /></Layout>} />
        <Route path="/logros" element={<Layout><AchievementsPage /></Layout>} />
        <Route path="/leaderboard" element={<Layout><GlobalLeaderboardPage /></Layout>} />
        <Route path="/tienda-galactica" element={<Layout><GalacticStore /></Layout>} />
        <Route path="/pase-estelar" element={<Layout><StellarPassPage /></Layout>} />
        <Route path="/vault" element={<Layout><VaultPage /></Layout>} />
        <Route path="/cartas" element={<Layout><OrbitLettersPage /></Layout>} />
        <Route path="/foco" element={<Layout><FocusRoom /></Layout>} />
        <Route path="/vinculos" element={<Layout><VinculosPage /></Layout>} />
        <Route path="/universo" element={<StellarMap />} />
        <Route path="/arquitectura" element={<Layout><ArquitecturaPage /></Layout>} />
        <Route path="/guestbook" element={<Layout><GuestbookPage /></Layout>} />
        <Route path="/desktop" element={<Layout><DesktopPage /></Layout>} />
        <Route path="/spotify-callback" element={<Suspense fallback={null}><SpotifyCallback /></Suspense>} />
        <Route path="/@:username" element={<Layout><ProfilePublic /></Layout>} />
        <Route path="/profile" element={user ? <Layout><ProfileOwn /></Layout> : <Layout><LoginGate /></Layout>} />
        <Route path="*" element={<Navigate to="/posts" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
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
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <AuthProvider>
      <EconomyProvider>
        <UniverseProvider>
          <CosmicProvider>
            <BrowserRouter>
              <DomainGuard />
              <DarkSideManager />
              <div className="scanline-overlay opacity-[0.03] fixed inset-0 pointer-events-none z-[99999]" />
              <AchievementToast />
              <PageTracker />
              <ScrollToTop />
              <StarfieldBg />
              <ClickRipple />
              <ActivityRadar />
              <WelcomeExperience />
              <CosmicEventBanner />
              <PresenceTracker />
              <MusicSyncTracker />
              <StellarOnboarding />
              <RedemptionInvite />
              <TycoonInvite />
              <Suspense fallback={<FallbackLoader />}>
                <AnimatedRoutes />
              </Suspense>
            </BrowserRouter>
          </CosmicProvider>
        </UniverseProvider>
      </EconomyProvider>
    </AuthProvider>
  );
}
