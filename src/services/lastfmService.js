import { supabase } from '../supabaseClient';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

function getApiKey() {
  const key = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
  if (!key) throw new Error('Falta VITE_LASTFM_API_KEY en el archivo .env');
  return key;
}

async function call(method, params = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) throw new Error(data.message || `Last.fm error ${data.error}`);
  return data;
}

// Last.fm returns this hash as placeholder when there's no image
const LASTFM_NOIMAGE = '2a96cbd8b46e442fc41c2b86b821562f';

function extractImage(images) {
  const url = images?.find(i => i.size === 'extralarge')?.['#text']
    || images?.find(i => i.size === 'large')?.['#text']
    || null;
  if (!url || url.includes(LASTFM_NOIMAGE)) return null;
  return url;
}

// In-memory cache to avoid duplicate iTunes calls
const _artCache = new Map();

async function itunesTrackArt(artist, track) {
  const key = `t:${artist}|${track}`;
  if (_artCache.has(key)) return _artCache.get(key);
  try {
    const q = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=1`);
    const data = await res.json();
    const raw = data.results?.[0]?.artworkUrl100 || null;
    const url = raw ? raw.replace('100x100bb', '300x300bb') : null;
    _artCache.set(key, url);
    return url;
  } catch { return null; }
}

async function itunesArtistArt(artist) {
  const key = `a:${artist}`;
  if (_artCache.has(key)) return _artCache.get(key);
  try {
    const q = encodeURIComponent(artist);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=musicArtist&limit=1`);
    const data = await res.json();
    const raw = data.results?.[0]?.artworkUrl100 || null;
    const url = raw ? raw.replace('100x100bb', '300x300bb') : null;
    _artCache.set(key, url);
    return url;
  } catch { return null; }
}

export const lastfmService = {
  // --- DB ---

  async connect(username) {
    // Verify username exists before saving
    await call('user.getinfo', { user: username });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const { error } = await supabase
      .from('lastfm_connections')
      .upsert({ user_id: user.id, lastfm_username: username, updated_at: new Date().toISOString() });

    if (error) throw error;
  },

  async disconnect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('lastfm_connections')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getUsername(userId) {
    const { data, error } = await supabase
      .from('lastfm_connections')
      .select('lastfm_username')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.lastfm_username;
  },

  async isConnected(userId) {
    const username = await this.getUsername(userId);
    return !!username;
  },

  // --- Last.fm API ---

  async getUserInfo(username) {
    const data = await call('user.getinfo', { user: username });
    return data.user;
  },

  // Returns the currently playing track, or null
  async getCurrentPlaying(username) {
    const data = await call('user.getrecenttracks', {
      user: username,
      limit: 1,
      extended: 1,
    });

    const tracks = data.recenttracks?.track;
    if (!tracks) return null;

    const latest = Array.isArray(tracks) ? tracks[0] : tracks;
    if (!latest || latest['@attr']?.nowplaying !== 'true') return null;

    const artist = latest.artist?.name || latest.artist?.['#text'] || 'Unknown';
    const name = latest.name;
    let image = extractImage(latest.image);
    if (!image) image = await itunesTrackArt(artist, name);

    return { name, artist, album: latest.album?.['#text'] || '', image, url: latest.url };
  },

  // Returns recent tracks (last 10)
  async getRecentTracks(username, limit = 10) {
    const data = await call('user.getrecenttracks', { user: username, limit, extended: 1 });
    const tracks = data.recenttracks?.track || [];
    const list = (Array.isArray(tracks) ? tracks : [tracks])
      .filter(t => t['@attr']?.nowplaying !== 'true')
      .slice(0, limit);

    return Promise.all(list.map(async t => {
      const artist = t.artist?.name || t.artist?.['#text'] || 'Unknown';
      let image = extractImage(t.image);
      if (!image) image = await itunesTrackArt(artist, t.name);
      return {
        name: t.name,
        artist,
        album: t.album?.['#text'] || '',
        image,
        url: t.url,
        date: t.date?.uts ? new Date(t.date.uts * 1000) : null,
      };
    }));
  },

  // Top tracks of the last 7 days
  async getTopTracks(username, limit = 10) {
    const data = await call('user.gettoptracks', { user: username, period: '7day', limit });
    const tracks = data.toptracks?.track || [];
    const list = Array.isArray(tracks) ? tracks : [tracks];

    return Promise.all(list.map(async t => {
      const artist = t.artist?.name || 'Unknown';
      let image = extractImage(t.image);
      if (!image) image = await itunesTrackArt(artist, t.name);
      return {
        name: t.name,
        artist,
        playcount: parseInt(t.playcount) || 0,
        image,
        url: t.url,
      };
    }));
  },

  // Top artists of the last 7 days
  async getTopArtists(username, limit = 6) {
    const data = await call('user.gettopartists', { user: username, period: '7day', limit });
    const artists = data.topartists?.artist || [];
    const list = Array.isArray(artists) ? artists : [artists];

    return Promise.all(list.map(async a => {
      let image = extractImage(a.image);
      if (!image) image = await itunesArtistArt(a.name);
      return {
        name: a.name,
        playcount: parseInt(a.playcount) || 0,
        image,
        url: a.url,
      };
    }));
  },

  // --- Emotional label from Last.fm tags ---
  async _emotionalLabel(artist) {
    try {
      const data = await call('artist.getTopTags', { artist, autocorrect: 1 });
      const tags = (data.toptags?.tag || []).map(t => t.name.toLowerCase());
      const map = [
        [['metal', 'heavy metal', 'death metal', 'black metal'], 'Intensidad Máxima'],
        [['electronic', 'edm', 'techno', 'house', 'trance'],     'Pulso Digital'],
        [['dance', 'club'],                                        'Euforia Activa'],
        [['hip-hop', 'rap', 'trap', 'urban'],                     'Ritmo Urbano'],
        [['pop'],                                                   'Vibra Luminosa'],
        [['rock', 'alternative', 'punk'],                          'Energía Eléctrica'],
        [['jazz', 'blues'],                                        'Calma Jazzística'],
        [['classical', 'orchestral', 'piano'],                    'Introspección Profunda'],
        [['ambient', 'drone', 'new age'],                         'Deriva Etérea'],
        [['folk', 'acoustic', 'country'],                         'Raíces Sonoras'],
        [['r&b', 'soul', 'funk'],                                  'Resonancia Profunda'],
        [['reggae', 'reggaeton', 'latin'],                         'Onda Libre'],
        [['indie'],                                                 'Frecuencia Indie'],
      ];
      for (const [keywords, label] of map) {
        if (tags.some(t => keywords.some(k => t.includes(k)))) return label;
      }
      return null;
    } catch { return null; }
  },

  // --- SYNC para "Ahora Suena" ---
  _lastSyncedTrackId: null,

  _trackSlug(artist, name) {
    return `lastfm:${(artist + '|' + name).toLowerCase().replace(/\s+/g, '-').slice(0, 80)}`;
  },

  async syncCurrentSoundState() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const username = await this.getUsername(user.id);
    if (!username) return null;

    const track = await this.getCurrentPlaying(username);
    const isPlaying = !!track;
    const trackId = track
      ? this._trackSlug(track.artist, track.name)
      : this._lastSyncedTrackId;

    if (!trackId) return null;

    const emotionalLabel = track ? await this._emotionalLabel(track.artist) : null;

    const { error: rpcError } = await supabase.rpc('sync_user_sound_state', {
      p_track_id: trackId,
      p_track_name: track?.name || '',
      p_artist_id: 'lastfm',
      p_artist_name: track?.artist || '',
      p_valence: null,
      p_energy: null,
      p_tempo: null,
      p_emotional_label: emotionalLabel,
      p_is_playing: isPlaying,
      p_track_image_url: track?.image || null,
    });
    if (rpcError) console.warn('[LastfmSync] RPC error:', rpcError.message);

    if (isPlaying && trackId !== this._lastSyncedTrackId) {
      this._lastSyncedTrackId = trackId;
      supabase.from('track_play_logs').insert({
        user_id: user.id,
        track_id: trackId,
        track_name: track.name,
        artist_name: track.artist,
        track_image_url: track.image || null,
      }).then(({ error }) => {
        if (error) console.warn('[Last.fm] No se pudo registrar reproducción:', error.message);
      });
    }

    return track;
  },
};
