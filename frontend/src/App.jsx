import React, { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";

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
import { trackPageVisit } from "./hooks/useStarlys";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { EconomyProvider } from "./contexts/EconomyContext";
import { UniverseProvider, useUniverse } from "./contexts/UniverseContext.jsx";
import { spotifyService } from "./services/spotifyService";
import WelcomeExperience from "./components/WelcomeExperience";
import StarfieldBg from "./components/StarfieldBg";
import ClickRipple from "./components/ClickRipple";
import ActivityRadar from "./components/ActivityRadar";
import { CosmicProvider } from "./components/Effects/CosmicProvider";
import TauriTitleBar from './components/TauriTitleBar';

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
const ProfileRedesign = lazy(() => import("./pages/Profile/ProfileRedesign"));
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
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const CommunitiesPage = lazy(() => import("./pages/CommunitiesPage"));
const CommunityChannelsPage = lazy(() => import("./pages/CommunityChannelsPage"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AnimeSpacePage = lazy(() => import("./features/anime/AstroPartyPage"));
const MangaPartyPage = lazy(() => import("./features/manga/MangaPartyPage"));
const SpacesPage = lazy(() => import("./pages/SpacesPage"));
const SpaceCreatePage = lazy(() => import("./pages/SpaceCreatePage"));
const SpaceSessionPage = lazy(() => import("./pages/SpaceSessionPage"));

const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined ||
  window.location.hostname === 'tauri.localhost' ||
  window.location.protocol === 'tauri:'
);

const NAV_TRACE_KEY = "spacely_nav_trace_v1";
const FORCE_NAV_TRACE = false

function isNavTraceEnabled() {
  if (typeof window === "undefined") return false;
  if (FORCE_NAV_TRACE) return true;
  return window.location.search.includes("traceNav=1") || localStorage.getItem("traceNav") === "1";
}

function pushNavTrace(entry) {
  if (typeof window === "undefined" || !isNavTraceEnabled()) return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(NAV_TRACE_KEY) || "[]");
    const next = [...prev, { at: new Date().toISOString(), ...entry }].slice(-40);
    sessionStorage.setItem(NAV_TRACE_KEY, JSON.stringify(next));
    console.log("[NAV_TRACE]", next[next.length - 1]);
  } catch {
    // no-op trace safety
  }
}

if (typeof window !== "undefined") {
  window.__pushNavTrace = pushNavTrace;
}

function normalizeProfilePath(pathname) {
  if (!pathname || pathname === "/") return null;
  let next = pathname;

  // /posts/@user -> /@user (relative links accidentally resolved under /posts)
  if (next.startsWith("/posts/@")) {
    next = next.replace(/^\/posts/, "");
  }

  // /%40user -> /@user
  if (next.startsWith("/%40")) {
    next = `/@${next.slice(4)}`;
  }

  // /@@user or /@@@user -> /@user
  if (/^\/@{2,}/.test(next)) {
    next = `/${next.replace(/^\/@+/, "@")}`;
  }

  // /@/user -> /@user
  if (next.startsWith("/@/")) {
    next = `/@${next.slice(3)}`;
  }

  // remove trailing slash except root
  if (next.length > 1 && next.endsWith("/")) {
    next = next.slice(0, -1);
  }

  return next !== pathname ? next : null;
}

function recoverProfilePathFromUnknown(pathname) {
  if (!pathname) return null;
  const raw = pathname;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const combined = `${raw} ${decoded}`;

  // Recover "arroba username" in almost any separator format
  const arrobaMatch = decoded.match(/arroba[\s/_-]*([a-zA-Z0-9_.-]{2,32})/i)
    || raw.match(/arroba[\s/_-]*([a-zA-Z0-9_.-]{2,32})/i);
  if (arrobaMatch?.[1]) {
    return `/@${encodeURIComponent(arrobaMatch[1])}`;
  }

  // Recover anything that looks like ".../@username" or ".../%40username"
  const atMatch = combined.match(/(?:\/|^)(?:@|%40)([^/?#\s]+)/i);
  if (atMatch?.[1]) {
    const username = atMatch[1].replace(/^@+/, "").trim();
    if (username) return `/@${encodeURIComponent(username)}`;
  }

  // Recover ".../profile/:id/..."
  const profileMatch = decoded.match(/\/profile\/([^/?#\s]+)/i);
  if (profileMatch?.[1]) {
    const id = profileMatch[1].trim();
    if (id) return `/profile/${encodeURIComponent(id)}`;
  }

  // Recover "/username" (single unknown segment)
  const parts = decoded.split("/").filter(Boolean);
  if (parts.length === 1) {
    const maybeUser = parts[0];
    const asArrobaWord = maybeUser.match(/^arroba([a-zA-Z0-9_.-]{2,32})$/i);
    if (asArrobaWord?.[1]) {
      return `/@${encodeURIComponent(asArrobaWord[1])}`;
    }
    if (/^[a-zA-Z0-9_.-]{2,32}$/.test(maybeUser)) {
      return `/@${encodeURIComponent(maybeUser)}`;
    }
  }

  // Recover "/posts/username" or "/post/username"
  if (parts.length === 2 && /^(posts?|feed)$/i.test(parts[0])) {
    const maybeUser = parts[1];
    if (/^[a-zA-Z0-9_.-]{2,32}$/.test(maybeUser)) {
      return `/@${encodeURIComponent(maybeUser)}`;
    }
  }

  // Recover nested variants like "/route/@user", "/algo/arroba/user"
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const current = parts[i];
    if (!current) continue;

    if (current.startsWith("@")) {
      const user = current.replace(/^@+/, "");
      if (/^[a-zA-Z0-9_.-]{2,32}$/.test(user)) {
        return `/@${encodeURIComponent(user)}`;
      }
    }

    if (/^arroba$/i.test(current) && parts[i + 1] && /^[a-zA-Z0-9_.-]{2,32}$/.test(parts[i + 1])) {
      return `/@${encodeURIComponent(parts[i + 1])}`;
    }
  }

  // Last-resort fallback for unknown paths: treat last segment as username.
  // This prevents bouncing to /posts when malformed profile links are generated.
  const last = parts[parts.length - 1];
  if (last) {
    const normalizedLast = last
      .replace(/^@+/, "")
      .replace(/^arroba/i, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "")
      .trim();
    if (/^[a-zA-Z0-9_.-]{2,32}$/.test(normalizedLast)) {
      return `/@${encodeURIComponent(normalizedLast)}`;
    }
  }

  return null;
}

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

// Loader para Suspense global (lazy chunks) — fixed, cubre pantalla completa
function FallbackLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308] z-[9999]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

// Loader en flujo para rutas con auth guard — reserva espacio evitando CLS
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

function NavTraceOverlay() {
  const [entries, setEntries] = React.useState([]);
  const enabled = isNavTraceEnabled();

  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      try {
        setEntries(JSON.parse(sessionStorage.getItem(NAV_TRACE_KEY) || "[]"));
      } catch {
        setEntries([]);
      }
    };
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed left-2 bottom-2 z-[100001] w-[min(96vw,420px)] max-h-[45vh] overflow-auto rounded-xl border border-red-500/40 bg-black/90 p-2 text-[10px] font-mono text-red-200">
      <div className="mb-2 flex items-center justify-between">
        <strong className="tracking-wider">NAV TRACE</strong>
        <button
          className="rounded bg-red-500/20 px-2 py-0.5"
          onClick={() => {
            sessionStorage.removeItem(NAV_TRACE_KEY);
            setEntries([]);
          }}
        >
          clear
        </button>
      </div>
      <div className="space-y-1">
        {entries.slice(-10).map((e, i) => (
          <div key={`${e.at}-${i}`} className="rounded bg-white/5 p-1">
            <div>{e.at}</div>
            <div>{e.type || "event"} {e.path ? `| ${e.path}` : ""}</div>
            {e.reason && <div>reason: {e.reason}</div>}
            {e.extra && <div>extra: {e.extra}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteNotFoundRedirect() {

  const location = useLocation();
  const recovered = recoverProfilePathFromUnknown(location.pathname);

  useEffect(() => {
    pushNavTrace({
      type: "redirect",
      reason: recovered ? "wildcard_profile_recover" : "wildcard_not_found",
      path: location.pathname,
      extra: recovered || location.search || ""
    });
  }, [location.pathname, location.search, recovered]);

  // Si ya es perfil válido, no intervenir
  if (location.pathname.startsWith("/@")) {
    return null;
  }

  if (recovered && recovered !== location.pathname) {
    return <Navigate to={recovered} replace />;
  }

  return <Navigate to="/posts" replace />;
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
      if (path === '/spaces') return 'EXPLORANDO ESPACIOS 🌐';
      if (path.startsWith('/spaces/')) return 'EN UN ESPACIO 🚀';
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
  }, [location.pathname, profile?.id, updatePresence, activeStation, isPresenceReady, profile]);
  return null;
}

function MusicSyncTracker() {
  const { user } = useAuthContext();
  useEffect(() => {
    if (!user || window.location.pathname === '/spotify-callback') return;
    const interval = setInterval(async () => {
      try {
        await spotifyService.syncCurrentSoundState();
      } catch (error) {
        // Silently handle Spotify auth errors - they're expected when token expires
        if (spotifyService.isAuthError(error)) {
          console.log('[MusicSync] Spotify authorization expired, stopping sync');
          clearInterval(interval);
        } else {
          console.error('[MusicSync] Unexpected error:', error);
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);
  return null;
}

// Prefetch de las rutas más visitadas después de que la app carga
function RoutePrefetcher() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./pages/PostsPage').catch(() => { });
      import('./pages/SpacesPage').catch(() => { });
      import('./pages/GlobalChatPage').catch(() => { });
      import('./pages/SpaceCabinPage').catch(() => { });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
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
  const normalizedPath = normalizeProfilePath(location.pathname);

  const isOnboardingPath = location.pathname === '/onboarding';
  const isLandingPath = location.pathname === '/';

  const shouldRedirectToOnboarding = !loading && !profileLoading && user && !profile?.username && !isOnboardingPath && !isLandingPath;
  const isAffinityPath = location.pathname === '/afinidad';
  const shouldRedirectToAffinity = !loading && !profileLoading && user && profile?.username && !profile?.affinity_completed && !isAffinityPath && !isLandingPath;

  useEffect(() => {
    pushNavTrace({
      type: "route",
      path: location.pathname,
      extra: location.search || ""
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (shouldRedirectToOnboarding) {
      pushNavTrace({
        type: "redirect",
        reason: "guard_onboarding",
        path: location.pathname
      });
    }
  }, [shouldRedirectToOnboarding, location.pathname]);

  useEffect(() => {
    if (shouldRedirectToAffinity) {
      pushNavTrace({
        type: "redirect",
        reason: "guard_affinity",
        path: location.pathname
      });
    }
  }, [shouldRedirectToAffinity, location.pathname]);

  if (normalizedPath) {
    pushNavTrace({
      type: "redirect",
      reason: "normalize_profile_path",
      path: location.pathname,
      extra: normalizedPath
    });
    return <Navigate to={`${normalizedPath}${location.search || ''}`} replace />;
  }

  if (shouldRedirectToOnboarding) return <Navigate to="/onboarding" replace />;
  if (shouldRedirectToAffinity) return <Navigate to="/afinidad" replace />;

  // Auth guard para Tauri y Android — sin sesión, mostrar login
  const isNativeApp = isTauri || Capacitor.isNativePlatform();
  if (isNativeApp && loading) return <FallbackLoader />;
  if (isNativeApp && !loading && !user) {
    // No mostrar LoginGate durante el callback de OAuth (evita doble login
    // cuando la página recarga tras el redirect y getSession() aún es null).
    const isAuthCallback = location.pathname === '/auth/callback';
    if (!isAuthCallback) return <LoginGate />;
  }

  if (isTauri || Capacitor.isNativePlatform()) {
    return (
      <AnimatePresence mode="popLayout">
        <Routes location={location} key={location.pathname}>
          <Route path="/onboarding" element={<Layout><OnboardingPage /></Layout>} />
          <Route path="/afinidad" element={<Layout><AffinityPage /></Layout>} />
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/descargar" element={<Layout><DownloadPage /></Layout>} />
          <Route path="/download" element={<Layout><DownloadPage /></Layout>} />
          <Route path="/descargas" element={<Layout><DownloadPage /></Layout>} />
          <Route path="/explorar" element={<Layout><ExplorePage /></Layout>} />
          <Route path="/communities" element={<Layout><CommunitiesPage /></Layout>} />
          <Route path="/community/:slug" element={<Layout><CommunityChannelsPage /></Layout>} />
          <Route path="/posts" element={<Layout><PostsPage /></Layout>} />
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
          <Route path="/universo" element={<Layout><UniversoPage /></Layout>} />
          <Route path="/arquitectura" element={<Layout><ArquitecturaPage /></Layout>} />
          <Route path="/guestbook" element={<Layout><GuestbookPage /></Layout>} />
          <Route path="/spaces" element={<Layout><SpacesPage /></Layout>} />
          <Route path="/spaces/new" element={<Layout><SpaceCreatePage /></Layout>} />
          <Route path="/spaces/:spaceId" element={<Layout><SpaceSessionPage /></Layout>} />
          <Route path="/anime" element={<Layout><AnimeSpacePage /></Layout>} />
          <Route path="/manga-party" element={<Layout><MangaPartyPage /></Layout>} />
          <Route path="/desktop" element={<Layout><DesktopPage /></Layout>} />
          <Route path="/spotify-callback" element={<Suspense fallback={null}><SpotifyCallback /></Suspense>} />
          <Route path="/auth/callback" element={<Suspense fallback={null}><AuthCallback /></Suspense>} />
          <Route path="/@:username" element={<Layout><ProfileRedesign /></Layout>} />
          <Route path="/profile/:userId" element={<Layout><ProfileRedesign /></Layout>} />
          <Route path="/profile" element={<Layout><ProfileRedesign /></Layout>} />
          <Route path="/:username" element={<Layout><ProfileRedesign /></Layout>} />
          <Route path="*" element={<RouteNotFoundRedirect />} />
        </Routes>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <Routes location={location} key={location.pathname}>
        <Route path="/onboarding" element={<Layout><OnboardingPage /></Layout>} />
        <Route path="/afinidad" element={<Navigate to="/descargas" replace />} />
        <Route path="/" element={<Navigate to="/descargas" replace />} />
        <Route path="/descargar" element={<Layout><DownloadPage /></Layout>} />
        <Route path="/download" element={<Layout><DownloadPage /></Layout>} />
        <Route path="/descargas" element={<Layout><DownloadPage /></Layout>} />
        <Route path="/explorar" element={<Navigate to="/descargas" replace />} />
        <Route path="/communities" element={<Navigate to="/descargas" replace />} />
        <Route path="/community/:slug" element={<Navigate to="/descargas" replace />} />
        <Route path="/posts" element={<Navigate to="/descargas" replace />} />
        <Route path="/transmission/:postId" element={<Navigate to="/descargas" replace />} />
        <Route path="/bulletin" element={<Navigate to="/descargas" replace />} />
        <Route path="/games" element={<Navigate to="/descargas" replace />} />
        <Route path="/game/:gameId" element={<Navigate to="/descargas" replace />} />
        <Route path="/tienda" element={<Navigate to="/descargas" replace />} />
        <Route path="/banco" element={<Navigate to="/descargas" replace />} />
        <Route path="/mercado-negro" element={<Navigate to="/descargas" replace />} />
        <Route path="/chat" element={<Navigate to="/descargas" replace />} />
        <Route path="/cabina" element={<Navigate to="/descargas" replace />} />
        <Route path="/inventory" element={<Navigate to="/descargas" replace />} />
        <Route path="/logros" element={<Navigate to="/descargas" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/descargas" replace />} />
        <Route path="/tienda-galactica" element={<Navigate to="/descargas" replace />} />
        <Route path="/pase-estelar" element={<Navigate to="/descargas" replace />} />
        <Route path="/vault" element={<Navigate to="/descargas" replace />} />
        <Route path="/cartas" element={<Navigate to="/descargas" replace />} />
        <Route path="/foco" element={<Navigate to="/descargas" replace />} />
        <Route path="/vinculos" element={<Navigate to="/descargas" replace />} />
        <Route path="/universo" element={<Navigate to="/descargas" replace />} />
        <Route path="/arquitectura" element={<Navigate to="/descargas" replace />} />
        <Route path="/guestbook" element={<Navigate to="/descargas" replace />} />
        <Route path="/spaces" element={<Navigate to="/descargas" replace />} />
        <Route path="/spaces/new" element={<Navigate to="/descargas" replace />} />
        <Route path="/spaces/:spaceId" element={<Navigate to="/descargas" replace />} />
        <Route path="/anime" element={<Navigate to="/descargas" replace />} />
        <Route path="/manga-party" element={<Navigate to="/descargas" replace />} />
        <Route path="/desktop" element={<Navigate to="/descargas" replace />} />
        <Route path="/spotify-callback" element={<Suspense fallback={null}><SpotifyCallback /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={null}><AuthCallback /></Suspense>} />
        <Route path="/@:username" element={<Navigate to="/descargas" replace />} />
        <Route path="/:username" element={<Navigate to="/descargas" replace />} />
        <Route path="/profile/:userId" element={<Navigate to="/descargas" replace />} />
        <Route path="/profile" element={<Navigate to="/descargas" replace />} />
        <Route path="*" element={<RouteNotFoundRedirect />} />
      </Routes>
    </AnimatePresence>
  );
}

// Tauri Desktop oAuth Recovery: HashRouter completely ignores window.location.pathname 
// and window.location.search, resolving them as the root `/`. 
// If Supabase redirects us to `http://tauri.localhost/auth/callback?code=...`, we must 
// inject that back into the hash `/#/auth/callback?code=...` before React routes it.
if (typeof window !== 'undefined' && isTauri && window.location.pathname === '/auth/callback') {
  const recoveredUrl = `/#/auth/callback${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, '', recoveredUrl);
}

const AppRouter = isTauri ? HashRouter : BrowserRouter;

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
            <AppRouter>
              {isTauri && <TauriTitleBar />}
              <DomainGuard />
              <DarkSideManager />
              <div className="scanline-overlay opacity-[0.03] fixed inset-0 pointer-events-none z-[99999]" />
              <AchievementToast />
              <PageTracker />
              <ScrollToTop />
              <StarfieldBg />
              <ClickRipple />
              <ActivityRadar />
              <NavTraceOverlay />
              <WelcomeExperience />
              <PresenceTracker />
              <MusicSyncTracker />
              <RoutePrefetcher />
              <StellarOnboarding />
              <RedemptionInvite />
              <TycoonInvite />
              <Suspense fallback={<FallbackLoader />}>
                <AnimatedRoutes />
              </Suspense>
            </AppRouter>
          </CosmicProvider>
        </UniverseProvider>
      </EconomyProvider>
    </AuthProvider>
  );
}
