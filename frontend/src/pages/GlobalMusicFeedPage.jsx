import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { openUrl } from '../utils/openUrl';
import { Music, Radio, User, Sparkles, TrendingUp } from 'lucide-react';
import '../styles/global-music-feed.css';

function StatusBadge({ isPlaying }) {
    if (isPlaying) {
        return (
            <span className="gf-badge gf-badge--live">
                <span className="gf-badge__dot" />
                En vivo
            </span>
        );
    }
    return <span className="gf-badge gf-badge--last">Última</span>;
}

function MusicCard({ item }) {
    const username = item.profiles?.username || item.user_id?.slice(0, 8);
    const avatar   = item.profiles?.avatar_url;
    const spotifyUrl = item.track_id ? `https://open.spotify.com/track/${item.track_id}` : null;

    const timeAgo = (ts) => {
        if (!ts) return '';
        const d = Math.floor((Date.now() - new Date(ts)) / 1000);
        if (d < 60)    return 'ahora';
        if (d < 3600)  return `${Math.floor(d / 60)}m`;
        if (d < 86400) return `${Math.floor(d / 3600)}h`;
        return `${Math.floor(d / 86400)}d`;
    };

    return (
        <motion.div className="gf-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
            <button className="gf-card__cover" onClick={() => spotifyUrl && openUrl(spotifyUrl)} title="Abrir en Spotify">
                {item.track_image_url
                    ? <img src={item.track_image_url} alt={item.track_name} />
                    : <div className="gf-card__cover-placeholder"><Music size={24} /></div>
                }
                {item.is_playing && (
                    <div className="gf-card__eq">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="gf-card__eq-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                )}
            </button>

            <div className="gf-card__info">
                <p className="gf-card__track" title={item.track_name}>{item.track_name || '—'}</p>
                <p className="gf-card__artist">{item.artist_name || '—'}</p>
                {item.emotional_label && <p className="gf-card__mood">{item.emotional_label}</p>}
            </div>

            <div className="gf-card__user">
                {username && (
                    <Link to={`/@${username}`} className="gf-card__avatar-link">
                        {avatar
                            ? <img src={avatar} alt={username} className="gf-card__avatar" />
                            : <div className="gf-card__avatar gf-card__avatar--placeholder"><User size={14} /></div>
                        }
                        <span className="gf-card__username">@{username}</span>
                    </Link>
                )}
                <StatusBadge isPlaying={item.is_playing} />
                <span className="gf-card__time">{timeAgo(item.updated_at)}</span>
            </div>
        </motion.div>
    );
}

function DiscoverCard({ track, count, onPlay }) {
    return (
        <motion.div
            className="gf-discover-card"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={onPlay}
        >
            {track.image
                ? <img src={track.image} alt={track.name} className="gf-discover-card__img" />
                : <div className="gf-discover-card__img gf-discover-card__img--empty"><Music size={18} /></div>
            }
            <div className="gf-discover-card__info">
                <p className="gf-discover-card__name">{track.name}</p>
                <p className="gf-discover-card__artist">{track.artist}</p>
            </div>
            <div className="gf-discover-card__count">
                <User size={11} />
                <span>{count}</span>
            </div>
        </motion.div>
    );
}

export default function GlobalMusicFeedPage() {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const channelRef = useRef(null);

    const loadFeed = async () => {
        const { data: states } = await supabase
            .from('user_sound_state')
            .select('user_id, track_id, track_name, artist_name, track_image_url, is_playing, emotional_label, updated_at')
            .order('updated_at', { ascending: false })
            .limit(100);

        if (!states?.length) { setLoading(false); return; }

        const userIds = [...new Set(states.map(s => s.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        const merged = states
            .map(s => ({ ...s, profiles: profileMap[s.user_id] || null }))
            .sort((a, b) => {
                if (a.is_playing !== b.is_playing) return a.is_playing ? -1 : 1;
                return new Date(b.updated_at) - new Date(a.updated_at);
            });

        setFeed(merged);
        setLoading(false);
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
        loadFeed();

        channelRef.current = supabase
            .channel('global-music-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sound_state' }, loadFeed)
            .subscribe();

        return () => { channelRef.current?.unsubscribe(); };
    }, []);

    // Sección descubrir: tracks únicos de otros usuarios, ordenados por popularidad en el feed
    const discoverTracks = (() => {
        const others = feed.filter(f => f.user_id !== currentUserId && f.track_id);
        const map = {};
        others.forEach(f => {
            if (!map[f.track_id]) {
                map[f.track_id] = {
                    id: f.track_id,
                    name: f.track_name,
                    artist: f.artist_name,
                    image: f.track_image_url,
                    count: 0,
                };
            }
            map[f.track_id].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 20);
    })();

    const playing = feed.filter(f => f.is_playing);
    const recent  = feed.filter(f => !f.is_playing);

    return (
        <div className="gf-page">
            <div className="gf-header">
                <Radio size={28} className="gf-header__icon" />
                <div>
                    <h1 className="gf-header__title">Ahora Suena</h1>
                    <p className="gf-header__sub">Lo que la comunidad escucha en tiempo real</p>
                </div>
                {playing.length > 0 && (
                    <span className="gf-header__count">{playing.length} en vivo</span>
                )}
            </div>

            {loading ? (
                <div className="gf-loading">
                    <div className="gf-loading__bars">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="gf-loading__bar" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                </div>
            ) : feed.length === 0 ? (
                <div className="gf-empty">
                    <Music size={48} />
                    <p>Nadie está escuchando aún.<br />Conecta tu Spotify para aparecer aquí.</p>
                </div>
            ) : (
                <>
                    {/* Descubrir música */}
                    {discoverTracks.length > 0 && (
                        <section className="gf-section">
                            <h2 className="gf-section__title">
                                <Sparkles size={14} /> Descubrir — lo que escucha la comunidad
                            </h2>
                            <div className="gf-discover-list">
                                {discoverTracks.map(track => (
                                    <DiscoverCard
                                        key={track.id}
                                        track={track}
                                        count={track.count}
                                        onPlay={() => openUrl(`https://open.spotify.com/track/${track.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* En vivo */}
                    {playing.length > 0 && (
                        <section className="gf-section">
                            <h2 className="gf-section__title">
                                <span className="gf-section__dot" /> En vivo ahora
                            </h2>
                            <div className="gf-grid">
                                <AnimatePresence>
                                    {playing.map(item => <MusicCard key={item.user_id} item={item} />)}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}

                    {/* Últimas escuchadas */}
                    {recent.length > 0 && (
                        <section className="gf-section">
                            <h2 className="gf-section__title">
                                <TrendingUp size={14} /> Últimas escuchadas
                            </h2>
                            <div className="gf-grid">
                                <AnimatePresence>
                                    {recent.map(item => <MusicCard key={item.user_id} item={item} />)}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
