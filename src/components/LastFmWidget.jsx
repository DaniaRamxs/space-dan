import { useEffect, useState } from 'react';

const API_KEY  = import.meta.env.VITE_LASTFM_API_KEY;
const USERNAME = import.meta.env.VITE_LASTFM_USERNAME;

export default function LastFmWidget() {
  const [track, setTrack]   = useState(null);
  const [error, setError]   = useState(false);
  const [nowPlaying, setNowPlaying] = useState(false);

  useEffect(() => {
    if (!API_KEY || !USERNAME) return;

    const fetchTrack = async () => {
      try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=1`;
        const res  = await fetch(url);
        const data = await res.json();
        const item = data?.recenttracks?.track?.[0];
        if (!item) return;

        const isNow = item['@attr']?.nowplaying === 'true';
        setNowPlaying(isNow);
        setTrack({
          name:   item.name,
          artist: item.artist['#text'],
          album:  item.album['#text'],
          image:  item.image?.find(i => i.size === 'medium')?.['#text'] || null,
          url:    item.url,
        });
      } catch {
        setError(true);
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Not configured — don't render
  if (!API_KEY || !USERNAME) return null;
  if (error) return null;
  if (!track) return (
    <div className="lastfmWidget loading">
      <span className="lastfmDot" />
      <span className="lastfmText">conectando last.fm...</span>
    </div>
  );

  return (
    <a
      href={track.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`lastfmWidget${nowPlaying ? ' playing' : ''}`}
      title={nowPlaying ? 'Reproduciendo ahora' : 'Última canción'}
    >
      {track.image && (
        <img src={track.image} alt="" className="lastfmCover" />
      )}
      <div className="lastfmInfo">
        <div className="lastfmStatus">
          {nowPlaying
            ? <><span className="lastfmDot pulse" /> reproduciendo</>
            : <><span className="lastfmDot static" /> última escucha</>
          }
        </div>
        <div className="lastfmTrack">{track.name}</div>
        <div className="lastfmArtist">{track.artist}</div>
      </div>
    </a>
  );
}
