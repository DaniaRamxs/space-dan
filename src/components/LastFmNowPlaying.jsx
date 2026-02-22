// src/components/LastFmNowPlaying.jsx
import { useState, useEffect } from 'react';

const USER = import.meta.env.VITE_LASTFM_USER || import.meta.env.VITE_LASTFM_USERNAME || 'HikkiVT';
const KEY  = import.meta.env.VITE_LASTFM_KEY  || import.meta.env.VITE_LASTFM_API_KEY  || '37bea35ad8f57a95805a5c51747915d3';

export default function LastFmNowPlaying() {
    const [track, setTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState(false);

    const fetchTrack = async () => {
        if (!KEY) return;
        try {
            const res = await fetch(
                `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${KEY}&format=json&limit=1`
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            const tracks = data?.recenttracks?.track;
            if (!tracks || tracks.length === 0) return;

            const t = Array.isArray(tracks) ? tracks[0] : tracks;
            const nowPlaying = t['@attr']?.nowplaying === 'true';
            const img = t.image?.find(i => i.size === 'large')?.['#text']
                      || t.image?.find(i => i.size === 'medium')?.['#text']
                      || '';

            setTrack({
                name: t.name,
                artist: t.artist?.['#text'],
                album: t.album?.['#text'],
                url: t.url,
                img: img || null,
            });
            setIsPlaying(nowPlaying);
            setError(false);
        } catch {
            setError(true);
        }
    };

    useEffect(() => {
        if (!KEY) return;
        fetchTrack();
        const interval = setInterval(fetchTrack, 30_000);
        return () => clearInterval(interval);
    }, []);

    if (!KEY || error || !track) return null;

    return (
        <a
            href={`https://www.last.fm/user/${USER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="lfmWidget"
            title={`Last.fm — ${USER}`}
        >
            <div className="lfmLeft">
                {track.img
                    ? <img src={track.img} alt={track.album} className={`lfmCover${isPlaying ? ' lfmSpin' : ''}`} />
                    : <div className={`lfmCoverFallback${isPlaying ? ' lfmSpin' : ''}`}>♪</div>
                }
                {isPlaying && <span className="lfmDot" aria-hidden="true" />}
            </div>

            <div className="lfmInfo">
                <span className="lfmStatus">
                    {isPlaying ? '▶ escuchando ahora' : '⏱ última canción'}
                </span>
                <span className="lfmTrack">{track.name}</span>
                <span className="lfmArtist">{track.artist}</span>
            </div>

            <div className="lfmLogo" aria-label="Last.fm">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#d51007">
                    <path d="M10.599 15.8l-.799-2.2s-1.3 1.45-3.25 1.45c-1.72 0-2.95-1.5-2.95-3.9 0-3.1 1.55-4.2 3.1-4.2 2.2 0 2.9 1.44 3.5 3.25l.8 2.5c.8 2.4 2.3 4.35 6.6 4.35 3.1 0 5.2-1 5.2-3.5 0-2.05-1.15-3.1-3.3-3.6l-1.6-.35c-1.1-.25-1.4-.7-1.4-1.45 0-.85.65-1.35 1.7-1.35 1.15 0 1.75.45 1.85 1.5l2.35-.3c-.2-2.1-1.6-3.15-4.1-3.15-2.15 0-4.2.85-4.2 3.55 0 1.7.8 2.75 2.85 3.25l1.7.4c1.25.3 1.75.8 1.75 1.6 0 .95-.9 1.35-2.7 1.35-2.6 0-3.7-1.4-4.3-3.2l-.8-2.5c-1.05-3.2-2.75-4.4-5.95-4.4C1.7 5 0 7.6 0 11.25 0 14.75 1.65 17.3 5.5 17.3c2.7 0 4.15-1.1 5.1-1.5z"/>
                </svg>
            </div>
        </a>
    );
}
