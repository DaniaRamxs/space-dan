import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { awardCoins } from '../hooks/useDancoins';
import { unlockAchievement } from '../hooks/useAchievements';
import { useAuthContext } from '../contexts/AuthContext';
import { saveScore } from '../services/supabaseScores';
import Leaderboard from '../components/Leaderboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSeason } from '../hooks/useSeason';

import SeasonMiniBadge from '../components/SeasonMiniBadge';

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
  const { claimSeasonReward } = useSeason();
  const [openId, setOpenId] = useState(null);
  const [coinToast, setCoinToast] = useState(null);
  const [lbKey, setLbKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const toastTimer = useRef(null);
  const openIdRef = useRef(null);

  // Categorías únicas
  const categories = ['All', ...new Set(GAMES.map(g => g.category))];

  // Filtrado de juegos memoizado
  const filteredGames = GAMES.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCat === 'All' || game.category === filterCat;
    return matchesSearch && matchesCat;
  });

  // Mantener ref actualizada con el juego abierto
  useEffect(() => { openIdRef.current = openId; }, [openId]);

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
            if (rewardMeta.cap_hit) {
              console.log('[Season] Cap de monedas diario alcanzado.');
            }
            if (rewardMeta.boosts?.rush) {
              console.log('[Season] Fase final activa, ganancia aumentada.');
            }
          } else {
            awardCoins(bonus); // Fallback si falla backend
            showCoinToast(`+${bonus} ◈`);
          }
        } else {
          awardCoins(bonus); // Guest local fallback
          showCoinToast(`+${bonus} ◈`);
        }
      }

      // Guardar en Supabase si el usuario está autenticado
      const gameId = e.detail?.gameId || openIdRef.current;
      if (user && gameId && score != null) {
        saveScore(user.id, gameId, score).then(() => setLbKey(k => k + 1));
      }
    };

    window.addEventListener('dan:game-score', onScore);
    return () => window.removeEventListener('dan:game-score', onScore);
  }, [user, claimSeasonReward]);

  const showCoinToast = (msg) => {
    setCoinToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCoinToast(null), 2200);
  };

  const handleToggle = (gameId, isOpen) => {
    setOpenId(isOpen ? null : gameId);

    if (!isOpen) {
      const isNew = markGamePlayed(gameId);
      if (isNew) {
        awardCoins(5);
        showCoinToast('+5 ◈ juego nuevo!');
        const count = loadPlayedGames().size;
        if (count >= 5) unlockAchievement('gamer');
      }
    }
  };

  const activeGame = GAMES.find(g => g.id === openId);
  const GameComponent = activeGame?.component;

  return (
    <main className="card">
      <div className="pageHeader">
        <h1 style={{ letterSpacing: '2px' }}>GAMES.hub</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <p className="tinyText" style={{ margin: 0, opacity: 0.8 }}>{GAMES.length} minijuegos disponibles</p>
          <SeasonMiniBadge />
          {coinToast && <span className="gamesCoinToast">{coinToast}</span>}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar un juego..."
          className="searchBar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '1rem',
            outline: 'none',
            marginBottom: '12px'
          }}
        />
        <div className="categoryTabs" style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          scrollbarWidth: 'none'
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                background: filterCat === cat ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: filterCat === cat ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '900',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <p className="tinyText" style={{ textAlign: 'center', marginBottom: 15, opacity: 0.5, border: '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
          ⚠️ Inicia sesión para guardar tus récords y competir globalmente.
        </p>
      )}

      {filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
          <div style={{ fontSize: '3rem', marginBottom: 10 }}>📡</div>
          <p>No se encontraron juegos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="gamesGrid" style={{ marginTop: 0 }}>
          {filteredGames.map((game, i) => {
            const isPlayed = loadPlayedGames().has(game.id);
            return (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="gameCard"
                onClick={() => handleToggle(game.id, false)}
              >
                {!isPlayed && <span className="gameCardBadge">NUEVO</span>}
                <span className="gameCardIcon">{game.icon}</span>
                <span className="gameCardTitle">{game.title}</span>
                <span style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{game.category}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN GAME OVERLAY */}
      <AnimatePresence>
        {openId && activeGame && (
          <motion.div
            className="gameOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="crtEffect" />
            <div className="gameOverlayHeader">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{activeGame.icon}</span>
                <span style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>{activeGame.title}</span>
              </div>
              <button className="gameCloseBtn" onClick={() => setOpenId(null)} style={{ position: 'relative', zIndex: 100 }}>✕</button>
            </div>

            <div className="gameOverlayContent">
              <div className="gameScale">
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ color: 'var(--accent)', fontSize: 14, fontFamily: 'monospace' }}>inicializando_sistema...</div>}>
                    {GameComponent && <GameComponent />}
                  </Suspense>
                </ErrorBoundary>
              </div>

              {/* Game Stats Bar */}
              <div style={{
                display: 'flex',
                gap: 20,
                background: 'rgba(255,255,255,0.05)',
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 20,
                width: '100%',
                maxWidth: '600px',
                justifyContent: 'space-around',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ opacity: 0.5, fontSize: '0.6rem', textTransform: 'uppercase' }}>Daily Capacity</span>
                  <span style={{ color: (season?.daily_reward_earned || 0) >= (season?.daily_reward_cap || 1) ? '#ff5555' : 'var(--accent)' }}>
                    ◈ {season?.daily_reward_earned || 0} / {season?.daily_reward_cap || 0}
                  </span>
                </div>
                {season?.boost_multiplier > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ opacity: 0.5, fontSize: '0.6rem', textTransform: 'uppercase' }}>Active Boost</span>
                    <span style={{ color: '#ffea00' }}>x{season.boost_multiplier} Multiplier</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ opacity: 0.5, fontSize: '0.6rem', textTransform: 'uppercase' }}>Total Games Played</span>
                  <span>{loadPlayedGames().size}</span>
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '600px' }}>
                <Leaderboard gameId={activeGame.id} refreshKey={lbKey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
