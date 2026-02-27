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

import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabaseClient";

/* =========================
   LAZY PAGES
========================= */

const PostsPage = lazy(() => import("./pages/PostsPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const GlobalLeaderboardPage = lazy(() => import("./pages/GlobalLeaderboardPage"));
const GardenLayout = lazy(() => import("./layouts/GardenLayout"));
const DanProfilePage = lazy(() => import("./pages/DanProfilePage"));
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
const FocusRoom = lazy(() => import("./pages/FocusRoom"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const VinculosPage = lazy(() => import("./pages/VinculosPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const GlobalChatPage = lazy(() => import("./pages/GlobalChatPage"));

/* =========================
   ROUTE TRACKER
========================= */

function PageTracker() {
  const location = useLocation();
  const { awardCoins } = useEconomy();

  useEffect(() => {
    const path = location.pathname;
    const { isNew, total } = trackPageVisit(path);
    if (isNew) awardCoins(5, "page_visit", path);

    if (total >= 1) unlockAchievement("first_visit");
    if (total >= 10) unlockAchievement("explorer");

    const visited = JSON.parse(localStorage.getItem("space-dan-visited-pages") || "[]");
    if (visited.length > 20) unlockAchievement("completionist");

    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement("night_owl");
  }, [location.pathname, awardCoins]);

  return null;
}

/* =========================
   ROUTES
========================= */

function AnimatedRoutes() {
  const location = useLocation();
  const { user, profile, loading } = useAuthContext();

  const isOnboardingPath = location.pathname === "/onboarding";
  const isLandingPath = location.pathname === "/";

  if (!loading && user && !profile?.username && !isOnboardingPath && !isLandingPath) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<Navigate to="/posts" replace />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/leaderboard" element={<GlobalLeaderboardPage />} />
        <Route path="/tienda" element={<ShopPage />} />
        <Route path="/chat" element={<GlobalChatPage />} />
        <Route path="/profile" element={user ? <ProfileOwn /> : <Navigate to="/posts" />} />
        <Route path="/:username" element={<ProfilePublic />} />
      </Routes>
    </AnimatePresence>
  );
}

/* =========================
   MAIN APP
========================= */

export default function App() {

  /* ===== OAuth Deep Link Listener ===== */

  useEffect(() => {
    const sub = CapacitorApp.addListener("appUrlOpen", async (event) => {
      const url = event.url;

      if (url?.startsWith("com.dan.space://auth")) {
        try {
          await Browser.close();
          await supabase.auth.exchangeCodeForSession(url);
        } catch (err) {
          console.error("OAuth deep link error:", err);
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  /* ===== Theme Listener ===== */

  useEffect(() => {
    const onEquip = (e) => {
      if (e.detail?.category === "theme") {
        applyTheme(e.detail.itemId || "theme_default");
      }
    };

    window.addEventListener("dan:item-equipped", onEquip);
    return () => window.removeEventListener("dan:item-equipped", onEquip);
  }, []);

  return (
    <AuthProvider>
      <EconomyProvider>
        <UniverseProvider>
          <BrowserRouter>
            <AchievementToast />
            <Screensaver />
            <PageTracker />
            <Suspense fallback={<div style={{ color: "white" }}>Cargando...</div>}>
              <AnimatedRoutes />
            </Suspense>
          </BrowserRouter>
        </UniverseProvider>
      </EconomyProvider>
    </AuthProvider>
  );
}