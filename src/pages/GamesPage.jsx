import { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { awardCoins } from '../hooks/useDancoins';
import { unlockAchievement } from '../hooks/useAchievements';
import { useAuthContext } from '../contexts/AuthContext';
import { saveScore } from '../services/supabaseScores';
import Leaderboard from '../components/Leaderboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSeason } from '../hooks/useSeason';
import SeasonMiniBadge from '../components/SeasonMiniBadge';
import { arcadeAudio } from '../utils/arcadeAudio';
import { supabase } from '../supabaseClient';

const TicTacToe = lazy(() => import('../components/TicTacToe'));
const SnakeGame = lazy(() => import('../components/SnakeGame'));
const MemoryGame = lazy(() => import('../components/MemoryGame'));
const WhackAMole = lazy(() => import('../components/WhackAMole'));
const ColorMatch = lazy(() => import('../components/ColorMatch'));
const ReactionTime = lazy(() => import('../components/ReactionTime'));
const Game2048 = lazy(() => import('../components/Game2048'));
const Blackjack = lazy(() => import('../components/Blackjack'));
const SlidingPuzzle = lazy(() => import('../components/SlidingPuzzle'));
const Pong = lazy(() => import('../components/Pong'));
const SpaceInvaders = lazy(() => import('../components/SpaceInvaders'));
const Breakout = lazy(() => import('../components/Breakout'));
const Asteroids = lazy(() => import('../components/Asteroids'));
const TetrisGame = lazy(() => import('../components/TetrisGame'));
const FlappyBird = lazy(() => import('../components/FlappyBird'));
const Minesweeper = lazy(() => import('../components/Minesweeper'));
const DinoRunner = lazy(() => import('../components/DinoRunner'));
const ConnectFour = lazy(() => import('../components/ConnectFour'));
const SimonSays = lazy(() => import('../components/SimonSays'));
const CookieClicker = lazy(() => import('../components/CookieClicker'));
const MazeGame = lazy(() => import('../components/MazeGame'));
const CatchGame = lazy(() => import('../components/CatchGame'));
const DodgeGame = lazy(() => import('../components/DodgeGame'));

const GAMES = [
  { id: 'snake', icon: '🐍', title: 'snake', component: SnakeGame, category: 'Arcade' },
  { id: 'memory', icon: '🃏', title: 'memory', component: MemoryGame, category: 'Puzzle' },
  { id: 'ttt', icon: '❌', title: 'tic tac toe', component: TicTacToe, category: 'Table' },
  { id: 'whack', icon: '🐭', title: 'whack-a-mole', component: WhackAMole, category: 'Skill' },
  { id: 'color', icon: '🎨', title: 'color match', component: ColorMatch, category: 'Puzzle' },
  { id: 'reaction', icon: '⚡', title: 'reaction time', component: ReactionTime, category: 'Skill' },
  { id: '2048', icon: '🔢', title: '2048', component: Game2048, category: 'Puzzle' },
  { id: 'blackjack', icon: '🃠', title: 'blackjack', component: Blackjack, category: 'Table' },
  { id: 'puzzle', icon: '🧩', title: 'sliding puzzle', component: SlidingPuzzle, category: 'Puzzle' },
  { id: 'pong', icon: '🏓', title: 'pong', component: Pong, category: 'Arcade' },
  { id: 'invaders', icon: '👾', title: 'space invaders', component: SpaceInvaders, category: 'Arcade' },
  { id: 'breakout', icon: '🧱', title: 'breakout', component: Breakout, category: 'Arcade' },
  { id: 'asteroids', icon: '🚀', title: 'asteroids', component: Asteroids, category: 'Arcade' },
  { id: 'tetris', icon: '🟦', title: 'tetris', component: TetrisGame, category: 'Arcade' },
  { id: 'flappy', icon: '🐦', title: 'flappy bird', component: FlappyBird, category: 'Skill' },
  { id: 'mines', icon: '💣', title: 'buscaminas', component: Minesweeper, category: 'Puzzle' },
  { id: 'dino', icon: '🦕', title: 'dino runner', component: DinoRunner, category: 'Skill' },
  { id: 'connect4', icon: '🔴', title: 'connect four', component: ConnectFour, category: 'Table' },
  { id: 'simon', icon: '🔵', title: 'simon says', component: SimonSays, category: 'Skill' },
  { id: 'cookie', icon: '🍪', title: 'cookie clicker', component: CookieClicker, category: 'Arcade' },
  { id: 'maze', icon: '🌀', title: 'maze', component: MazeGame, category: 'Puzzle' },
  { id: 'catch', icon: '🧺', title: 'catch game', component: CatchGame, category: 'Skill' },
  { id: 'dodge', icon: '💨', title: 'dodge game', component: DodgeGame, category: 'Skill' },
];

const PLAYED_KEY = 'space-dan-played-games';

function loadPlayedGames() {
  try { return new Set(JSON.parse(localStorage.getItem(PLAYED_KEY) || '[]')); }
  catch { return new Set(); }
}

function markGamePlayed(gameId) {
  const played = loadPlayedGames();
  if (played.has(gameId)) return false;
  played.add(gameId);
  try { localStorage.setItem(PLAYED_KEY, JSON.stringify([...played])); } catch { }
  return true;
}

export default function GamesPage() {
  const { user } = useAuthContext();
  const { claimSeasonReward, season, refreshSeason } = useSeason();
  const [openId, setOpenId] = useState(null);
  const [coinToast, setCoinToast] = useState(null);
  const [lbKey, setLbKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [userStats, setUserStats] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [tickerItems, setTickerItems] = useState([
    "Bienvenido al Games HUB", "Nuevos retos disponibles", "Cargando feeds de la comunidad..."
  ]);

  const toastTimer = useRef(null);
  const openIdRef = useRef(null);

  useEffect(() => { arcadeAudio.toggle(soundOn); }, [soundOn]);

  // Fetch individual game stats (levels)
  useEffect(() => {
    if (user) {
      import('../services/supabaseScores').then(m => {
        m.getUserGameRanks(user.id).then(newStats => {
          if (userStats.length > 0) {
            newStats.forEach(ns => {
              const old = userStats.find(o => o.game_id === ns.game_id);
              if (old && ns.game_level > old.game_level) {
                arcadeAudio.play('level-up');
                showCoinToast(`🆙 NIVEL ${ns.game_level}!`);
              }
            });
          }
          setUserStats(newStats);
        });
      });
    }
  }, [user, lbKey]);

  // Fetch ticker items (simulated from DB)
  useEffect(() => {
    const fetchEvents = async () => {
      // Latest high scores globally
      const { data } = await supabase
        .from('scores')
        .select('game_id, score, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        const events = data.map(s => `🎰 ${s.profiles?.username || 'Piloto'} marcó ${s.score} en ${s.game_id.toUpperCase()}`);
        setTickerItems(prev => [...events, ...prev].slice(0, 10));
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Featured Game (Random but stable for session)
  const featuredGame = useMemo(() => {
    return GAMES[Math.floor(Math.random() * GAMES.length)];
  }, []);

  const categories = useMemo(() => ['All', ...new Set(GAMES.map(g => g.category))], []);

  const filteredGames = useMemo(() => {
    return GAMES.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = filterCat === 'All' || game.category === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [searchTerm, filterCat]);

  const playedSet = loadPlayedGames();
  const masteryProgress = (playedSet.size / GAMES.length) * 100;

  useEffect(() => { openIdRef.current = openId; }, [openId]);

  const showCoinToast = useCallback((msg) => {
    setCoinToast(msg);
    arcadeAudio.play('coin');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCoinToast(null), 2200);
  }, []);

  // Escuchar scores de los juegos
  useEffect(() => {
    const onScore = async (e) => {
      const { isHighScore, score } = e.detail || {};
      if (isHighScore) unlockAchievement('highscore');
      const bonus = Math.min(20, Math.floor((score || 0) / 20));
      if (bonus > 0) {
        if (user) {
          const rewardMeta = await claimSeasonReward(bonus);
          if (rewardMeta && rewardMeta.awarded !== undefined) {
            showCoinToast(`+${rewardMeta.awarded} ◈`);
          } else {
            awardCoins(bonus);
            showCoinToast(`+${bonus} ◈`);
          }
        } else {
          awardCoins(bonus);
          showCoinToast(`+${bonus} ◈`);
        }
      }
      const gameId = e.detail?.gameId || openIdRef.current;
      if (user && gameId && score != null) {
        saveScore(user.id, gameId, score).then(() => {
          setLbKey(k => k + 1);
          refreshSeason();
        });
      }
    };
    window.addEventListener('dan:game-score', onScore);
    return () => window.removeEventListener('dan:game-score', onScore);
  }, [user, claimSeasonReward, showCoinToast, refreshSeason]);

  const handleToggle = (gameId) => {
    arcadeAudio.play('select');
    setOpenId(gameId);
    if (gameId) {
      const isNew = markGamePlayed(gameId);
      if (isNew) {
        awardCoins(5);
        showCoinToast('+5 ◈ juego nuevo!');
        if (loadPlayedGames().size >= 5) unlockAchievement('gamer');
      }
    }
  };

  const handleSurpriseMe = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    handleToggle(randomGame.id);
  };

  const activeGame = GAMES.find(g => g.id === openId);
  const GameComponent = activeGame?.component;

  const getTierClass = (level) => {
    if (level >= 50) return 'tier-mythic';
    if (level >= 20) return 'tier-legendary';
    return '';
  };

  return (
    <main className="card" style={{ paddingTop: 60, paddingBottom: 40 }}>
      {/* HUD HEADER */}
      <div className="pageHeader" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 15, marginBottom: 20 }}>
        <div>
          <h1 style={{ letterSpacing: '4px', margin: 0, fontSize: '1.8rem' }}>GAMES<span style={{ color: 'var(--accent)' }}>.hub</span></h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>Arcade Status:</span>
            <span style={{ height: 6, width: 6, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 8px #00ff00' }} />
            <span style={{ fontSize: '0.7rem', color: '#00ff00', fontWeight: 'bold' }}>SYSTEM_NOMINAL</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <SeasonMiniBadge />
          {coinToast && <motion.span initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="gamesCoinToast">{coinToast}</motion.span>}
        </div>
      </div>

      {/* BENTO DASHBOARD */}
      <div className="bentoGrid">
        <div className="bentoItem bentoLarge" style={{ background: 'linear-gradient(135deg, rgba(255,110,180,0.1), transparent)' }}>
          <div style={{ position: 'absolute', top: 15, right: 15 }}>
            <button
              onClick={() => setSoundOn(!soundOn)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6 }}
            >
              {soundOn ? '🔊' : '🔈'}
            </button>
          </div>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, opacity: 0.5 }}>STATUS_PILOTO</span>
          <h3 style={{ margin: '5px 0 15px 0', fontSize: '1.2rem' }}>{user?.user_metadata?.username || 'PILOTO_INVITADO'}</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ opacity: 0.5, fontSize: '0.5rem' }}>MAESTRÍA</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{Math.floor(masteryProgress)}%</div>
            </div>
            <div>
              <div style={{ opacity: 0.5, fontSize: '0.5rem' }}>RANK_TEMP</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>#{season?.rank || '—'}</div>
            </div>
          </div>
          <div style={{ marginTop: 15, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${masteryProgress}%` }} style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
        </div>

        <div className="bentoItem" onClick={handleSurpriseMe} style={{ cursor: 'pointer', border: '1px solid rgba(255,215,0,0.2)' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: 5 }}>🎲</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>QUICK_PLAY</span>
          <span style={{ fontSize: '0.5rem', opacity: 0.5 }}>Lanzar juego aleatorio</span>
        </div>

        <div className="bentoItem" style={{ border: '1px solid rgba(0,229,255,0.2)' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: 5 }}>⏳</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>DAILY_CAP</span>
          <span style={{ fontSize: '0.7rem', color: '#00e5ff' }}>◈ {season?.daily_reward_earned || 0}/{season?.daily_reward_cap || 0}</span>
        </div>

        <div className="bentoItem bentoWide" style={{ background: 'rgba(255,110,180,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>EVENTO_ACTIVO</span>
              <div style={{ fontWeight: 900, color: '#ffea00' }}>MULTIPLIER x{season?.boost_multiplier || 1.0}</div>
            </div>
            <div style={{ fontSize: '1.5rem' }}>🔥</div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ marginBottom: 25 }}>
        <div style={{ position: 'relative', marginBottom: 15 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="searchBar"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              arcadeAudio.play('blip');
            }}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', padding: '14px 14px 14px 44px', color: '#fff', fontSize: '1rem', outline: 'none'
            }}
          />
        </div>
        <div className="categoryTabs" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setFilterCat(cat);
                arcadeAudio.play('blip');
              }}
              style={{
                background: filterCat === cat ? 'linear-gradient(45deg, var(--accent-dim), var(--accent))' : 'rgba(255,255,255,0.05)',
                color: filterCat === cat ? '#fff' : 'rgba(255,255,255,0.5)',
                border: 'none', padding: '8px 18px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900',
                whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.3s',
                boxShadow: filterCat === cat ? '0 4px 15px var(--accent-dim)' : 'none'
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      {filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.3 }}>
          <div style={{ fontSize: '4rem', marginBottom: 15 }}>🛸</div>
          <p style={{ fontWeight: 'bold' }}>No se detectaron señales de ese juego.</p>
        </div>
      ) : (
        <div className="gamesGrid" style={{ marginTop: 0 }}>
          <AnimatePresence mode='popLayout'>
            {filteredGames.map((game, i) => {
              const isPlayed = playedSet.has(game.id);
              const stats = userStats.find(s => s.game_id === game.id);
              return (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.01 }}
                  className={`gameCard ${getTierClass(stats?.game_level || 0)}`}
                  onClick={() => handleToggle(game.id)}
                  style={{ border: isPlayed ? undefined : '1px dotted var(--accent)' }}
                >
                  {!isPlayed && <span className="gameCardBadge">NUEVO</span>}
                  {stats?.game_level > 0 && (
                    <span className={`gameCardLevel ${stats.game_level >= 5 ? 'high-level' : ''}`} title="Nivel en este juego">
                      Lv.{stats.game_level}
                    </span>
                  )}
                  {stats?.user_position && (
                    <span className="gameCardRank" title="Tu posición en el ranking">
                      #{stats.user_position}
                    </span>
                  )}
                  <span className="gameCardIcon">{game.icon}</span>
                  <span className="gameCardTitle">{game.title}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{game.category}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* LIVE TICKER */}
      {!openId && (
        <div className="liveTickerContainer">
          <div className="liveTicker">
            {[...tickerItems, ...tickerItems].map((text, i) => (
              <span key={i} className="tickerItem">{text}</span>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN GAME OVERLAY */}
      <AnimatePresence>
        {openId && activeGame && (
          <motion.div
            className="gameOverlay"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="crtEffect" />
            <div className="gameOverlayHeader" style={{ background: 'rgba(5,5,20,0.8)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ fontSize: '2rem', animation: 'pulse 2s infinite' }}>{activeGame.icon}</div>
                <div>
                  <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: '1.2rem' }}>{activeGame.title}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: 1 }}>SISTEMA_ARCADE_V2.0</div>
                </div>
              </div>
              <button
                className="gameCloseBtn"
                onClick={() => {
                  arcadeAudio.play('close');
                  setOpenId(null);
                }}
                style={{ position: 'relative', zIndex: 5001, background: '#ff4444' }}
              >
                ESC
              </button>
            </div>

            <div className="gameOverlayContent">
              <div className="gameScale">
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ color: 'var(--accent)', fontSize: 14, fontFamily: 'monospace' }}>CARGANDO_ASSETS...</div>}>
                    {GameComponent && <GameComponent />}
                  </Suspense>
                </ErrorBoundary>
              </div>

              {/* Game Stats Bar */}
              <div style={{
                display: 'flex', gap: 15, background: 'rgba(255,110,180,0.05)', padding: '15px 25px', borderRadius: '20px',
                border: '1px solid rgba(255,110,180,0.2)', marginBottom: 25, width: '100%', maxWidth: '600px',
                justifyContent: 'space-around', fontSize: '0.75rem', fontWeight: 'bold', position: 'relative', zIndex: 1
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ opacity: 0.5, fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 3 }}>Daily Capacity</span>
                  <span style={{ color: (season?.daily_reward_earned || 0) >= (season?.daily_reward_cap || 1) ? '#ff5555' : 'var(--accent)' }}>
                    ◈ {season?.daily_reward_earned || 0} / {season?.daily_reward_cap || 0}
                  </span>
                </div>
                {season?.boost_multiplier > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ opacity: 0.5, fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 3 }}>Multiplier</span>
                    <span style={{ color: '#ffea00' }}>x{season.boost_multiplier} active</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ opacity: 0.5, fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 3 }}>User Rank</span>
                  <span style={{ color: '#00e5ff' }}>#{season?.rank || '—'}</span>
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '600px', position: 'relative', zIndex: 1 }}>
                <Leaderboard gameId={activeGame.id} refreshKey={lbKey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
