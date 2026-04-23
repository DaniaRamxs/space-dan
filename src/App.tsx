import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Providers } from './providers';
import { NativeInit } from '@/components/NativeInit';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { AuthGuard } from '@/components/AuthGuard';
import GardenLayout from '@/layouts/GardenLayout';

// -- Lazy Loading Pages --
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const PostsPage = lazy(() => import('@/pages/PostsPage'));
const CommunitiesPage = lazy(() => import('@/pages/CommunitiesPage'));
const GlobalChatPage = lazy(() => import('@/pages/GlobalChatPage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const GamesPage = lazy(() => import('@/pages/GamesPage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const GalacticStore = lazy(() => import('@/pages/GalacticStore'));
const SpaceCabinPage = lazy(() => import('@/pages/SpaceCabinPage'));
const OrbitLettersPage = lazy(() => import('@/pages/OrbitLettersPage'));
const DownloadPage = lazy(() => import('@/pages/DownloadPage'));
const VaultPage = lazy(() => import('@/pages/VaultPage'));
const VinculosPage = lazy(() => import('@/pages/VinculosPage'));
const UniversoPage = lazy(() => import('@/pages/UniversoPage'));
const SpacesPage = lazy(() => import('@/pages/SpacesPage'));
const DesktopPage = lazy(() => import('@/pages/DesktopPage'));
const FocusRoom = lazy(() => import('@/pages/FocusRoom'));
const GuestbookPage = lazy(() => import('@/pages/GuestbookPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const GlobalLeaderboardPage = lazy(() => import('@/pages/GlobalLeaderboardPage'));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const StellarPassPage = lazy(() => import('@/pages/StellarPassPage'));
const BlackMarketPage = lazy(() => import('@/pages/BlackMarketPage'));
const BankPage = lazy(() => import('@/pages/BankPage'));
const BulletinPage = lazy(() => import('@/pages/BulletinPage'));
const ArquitecturaPage = lazy(() => import('@/pages/ArquitecturaPage'));
const AffinityPage = lazy(() => import('@/pages/AffinityPage'));
const GlobalMusicFeedPage = lazy(() => import('@/pages/GlobalMusicFeedPage'));
const MangaPartyPage = lazy(() => import('@/spacely-features/manga/MangaPartyPage'));
const KinniesPage = lazy(() => import('@/pages/KinniesPage'));
const TestsPage = lazy(() => import('@/pages/TestsPage'));
const ProfileOwn = lazy(() => import('@/pages/Profile/ProfileOwn'));
const ProfilePublic = lazy(() => import('@/pages/Profile/ProfilePublic'));
const ProfileRedesign = lazy(() => import('@/pages/Profile/ProfileRedesign'));
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'));
const CommunityPage = lazy(() => import('@/pages/CommunityPage'));
const SpaceSessionPage = lazy(() => import('@/pages/SpaceSessionPage'));
const SpotifyCallback = lazy(() => import('@/pages/SpotifyCallback'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));

function LoadingSpinner() {
  // Fondo `#0b0d20` (no negro puro) + label textual para distinguir
  // "suspense activo" de "pantalla negra por crash" en el APK.
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: '#0b0d20' }}
    >
      <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <span
        style={{
          color: '#67e8f9',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}
      >
        Cargando Spacely…
      </span>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <GlobalErrorBoundary>
      <Providers>
        <NativeInit />
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/spotify-callback" element={<SpotifyCallback />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Main App Layout Wrapper — protegido por AuthGuard */}
          <Route
            element={
              <AuthGuard>
                <GardenLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/chat" element={<GlobalChatPage />} />
            <Route path="/explorar" element={<ExplorePage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/tienda" element={<ShopPage />} />
            <Route path="/tienda-galactica" element={<GalacticStore />} />
            <Route path="/cabina" element={<SpaceCabinPage />} />
            <Route path="/cartas" element={<OrbitLettersPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/vinculos" element={<VinculosPage />} />
            <Route path="/universo" element={<UniversoPage />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/desktop" element={<DesktopPage />} />
            <Route path="/foco" element={<FocusRoom />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/leaderboard" element={<GlobalLeaderboardPage />} />
            <Route path="/logros" element={<AchievementsPage />} />
            <Route path="/pase-estelar" element={<StellarPassPage />} />
            <Route path="/mercado-negro" element={<BlackMarketPage />} />
            <Route path="/banco" element={<BankPage />} />
            <Route path="/bulletin" element={<BulletinPage />} />
            <Route path="/arquitectura" element={<ArquitecturaPage />} />
            <Route path="/afinidad" element={<AffinityPage />} />
            <Route path="/ahora-suena" element={<GlobalMusicFeedPage />} />
            <Route path="/manga-party" element={<MangaPartyPage />} />
            <Route path="/kinnies" element={<KinniesPage />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/notifications" element={<PostsPage />} />
            
            {/* Dynamic Routes */}
            <Route path="/profile" element={<ProfileOwn />} />
            <Route path="/profile/:userId" element={<ProfilePublic />} />
            <Route path="/transmission/:postId" element={<PostDetailPage />} />
            <Route path="/log/:postId" element={<PostDetailPage />} />
            <Route path="/community/:slug" element={<CommunityPage />} />
            <Route path="/game/:gameId" element={<GamesPage />} />
            <Route path="/spaces/:spaceId" element={<SpaceSessionPage />} />
            
            {/* Username Route Fallback */}
            <Route path="/:username" element={<ProfileRedesign />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/posts" replace />} />
        </Routes>
        </Suspense>
      </Providers>
    </GlobalErrorBoundary>
  );
};

export default App;
