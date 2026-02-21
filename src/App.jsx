import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";

const PostsPage = lazy(() => import("./pages/PostsPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const Wpage = lazy(() => import("./pages/Wpage"));
const GardenLayout = lazy(() => import("./layouts/GardenLayout"));
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

// Un indicador de carga temporal mientras baja el chunk de JS
function FallbackLoader() {
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#050510" }}>
      <span className="blinkText" style={{ color: "var(--accent)" }}>cargando_datos...</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          {/* Warning page */}
          <Route path="/" element={<Wpage />} />

          {/* Paginas principales */}
          <Route path="/home" element={
            <GardenLayout>
              <Suspense fallback={null}><ProfilePage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/bulletin" element={
            <GardenLayout>
              <Suspense fallback={null}><BulletinPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/posts" element={
            <GardenLayout>
              <Suspense fallback={null}><PostsPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/posts/:id" element={
            <GardenLayout>
              <Suspense fallback={null}><PostPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/music" element={
            <GardenLayout>
              <Suspense fallback={null}><MusicPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/games" element={
            <GardenLayout>
              <Suspense fallback={null}><GamesPage /></Suspense>
            </GardenLayout>
          } />

          {/* Nuevas secciones */}
          <Route path="/kinnies" element={
            <GardenLayout>
              <Suspense fallback={null}><KinniesPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/tests" element={
            <GardenLayout>
              <Suspense fallback={null}><TestsPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/galeria" element={
            <GardenLayout>
              <Suspense fallback={null}><GalleryPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/watchlist" element={
            <GardenLayout>
              <Suspense fallback={null}><WatchlistPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/universo" element={
            <GardenLayout>
              <Suspense fallback={null}><UniversoPage /></Suspense>
            </GardenLayout>
          } />
          <Route path="/desktop" element={
            <Suspense fallback={null}><DesktopPage /></Suspense>
          } />
          <Route path="/dreamscape" element={
            <Suspense fallback={null}><DreamscapePage /></Suspense>
          } />
          <Route path="/timecapsule" element={
            <Suspense fallback={null}><TimeCapsulePage /></Suspense>
          } />
          <Route path="/guestbook" element={
            <GardenLayout>
              <Suspense fallback={null}><GuestbookPage /></Suspense>
            </GardenLayout>
          } />

          {/* Pagina secreta */}
          <Route path="/secret" element={<Secret />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
