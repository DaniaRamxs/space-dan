import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { awardCoins } from '../hooks/useDancoins';
import { unlockAchievement } from '../hooks/useAchievements';
import { useAuthContext } from '../contexts/AuthContext';
import { saveScore } from '../services/supabaseScores';
import Leaderboard from '../components/Leaderboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSeason } from '../hooks/useSeason';

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
  { id: 'snake', icon: '🐍', title: 'snake', component: SnakeGame },
  { id: 'memory', icon: '🃏', title: 'memory', component: MemoryGame },
  { id: 'ttt', icon: '❌', title: 'tic tac toe', component: TicTacToe },
  { id: 'whack', icon: '🐭', title: 'whack-a-mole', component: WhackAMole },
  { id: 'color', icon: '🎨', title: 'color match', component: ColorMatch },
  { id: 'reaction', icon: '⚡', title: 'reaction time', component: ReactionTime },
  { id: '2048', icon: '🔢', title: '2048', component: Game2048 },
  { id: 'blackjack', icon: '🃠', title: 'blackjack', component: Blackjack },
  { id: 'puzzle', icon: '🧩', title: 'sliding puzzle', component: SlidingPuzzle },
  { id: 'pong', icon: '🏓', title: 'pong', component: Pong },
  { id: 'invaders', icon: '👾', title: 'space invaders', component: SpaceInvaders },
  { id: 'breakout', icon: '🧱', title: 'breakout', component: Breakout },
  { id: 'asteroids', icon: '🚀', title: 'asteroids', component: Asteroids },
  { id: 'tetris', icon: '🟦', title: 'tetris', component: TetrisGame },
  { id: 'flappy', icon: '🐦', title: 'flappy bird', component: FlappyBird },
  { id: 'mines', icon: '💣', title: 'buscaminas', component: Minesweeper },
  { id: 'dino', icon: '🦕', title: 'dino runner', component: DinoRunner },
  { id: 'connect4', icon: '🔴', title: 'connect four', component: ConnectFour },
  { id: 'simon', icon: '🔵', title: 'simon says', component: SimonSays },
  { id: 'cookie', icon: '🍪', title: 'cookie clicker', component: CookieClicker },
  { id: 'maze', icon: '🌀', title: 'maze', component: MazeGame },
  { id: 'catch', icon: '🧺', title: 'catch game', component: CatchGame },
  { id: 'dodge', icon: '💨', title: 'dodge game', component: DodgeGame },
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
  const [lbKey, setLbKey] = useState(0); // incrementar fuerza refresh del leaderboard
  const toastTimer = useRef(null);
  const openIdRef = useRef(null);

  // Mantener ref actualizada con el juego abierto
  useEffect(() => { openIdRef.current = openId; }, [openId]);

  // Escuchar scores de los juegos
  useEffect(() => {
    const onScore = async (e) => {
      const { isHighScore, score } = e.detail || {};
      if (isHighScore) unlockAchievement('highscore');

      const bonus = Math.min(20, Math.floor((score || 0) / 50));
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

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>juegos</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p className="tinyText">{GAMES.length} minijuegos :3</p>
          {coinToast && <span className="gamesCoinToast">{coinToast}</span>}
        </div>
      </div>

      {!user && (
        <p className="tinyText" style={{ textAlign: 'center', marginBottom: 10, opacity: 0.6 }}>
          inicia sesión para guardar tus scores en el leaderboard
        </p>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {GAMES.map(game => {
          const isOpen = openId === game.id;
          const GameComponent = game.component;
          return (
            <section key={game.id} className="shSection">
              <div
                className="shHeader"
                onClick={() => handleToggle(game.id, isOpen)}
                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>{game.icon} {game.title}</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <>
                  <div className="shBody" style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px', overflowX: 'auto' }}>
                    <div className="gameScale">
                      <ErrorBoundary>
                        <Suspense fallback={<div style={{ color: 'var(--accent)', fontSize: 12 }}>cargando_juego...</div>}>
                          <GameComponent />
                        </Suspense>
                      </ErrorBoundary>
                    </div>

                  </div>
                  <Leaderboard gameId={game.id} refreshKey={lbKey} />
                </>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
