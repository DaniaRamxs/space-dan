// src/pages/MusicPage.jsx
import CompactMusicPlayer from "../components/CompactMusicPlayer";

export default function MusicPage() {
  return (
    <main className="card">
      <div className="pageHeader">
        <h1 style={{ margin: 0 }}>playlist en construccion</h1>
        <p className="tinyText">literalmente yo.</p>
      </div>

      <CompactMusicPlayer />
    </main>
  );
}
