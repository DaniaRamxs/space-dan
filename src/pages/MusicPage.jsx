// src/pages/MusicPage.jsx
import CompactMusicPlayer from "../components/CompactMusicPlayer";

export default function MusicPage() {
  return (
    <main className="card">
      <div className="pageHeader">
        <h1 style={{ margin: 0 }}>🎧 Música</h1>
        <p className="tinyText">próximamente — curating the perfect playlist</p>
      </div>

      <div className="musicComingSoon">
        <div className="musicComingSoonIcon">♪</div>
        <p className="musicComingSoonTitle">Sección en desarrollo</p>
        <p className="musicComingSoonText">
          Estoy armando una playlist curada con lo que escucho mientras codifico, diseño y creo.
          Vuelve pronto.
        </p>
      </div>

      <CompactMusicPlayer />
    </main>
  );
}
