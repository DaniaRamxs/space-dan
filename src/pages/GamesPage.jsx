import { useState, Suspense, lazy } from 'react';

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

export default function GamesPage() {
  const [openId, setOpenId] = useState(null);

  return (
    <main className="card">
      <div className="pageHeader">
        <h1>juegos</h1>
        <p className="tinyText">{GAMES.length} minijuegos :3</p>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {GAMES.map(game => {
          const isOpen = openId === game.id;
          const GameComponent = game.component;
          return (
            <section key={game.id} className="shSection">
              <div
                className="shHeader"
                onClick={() => setOpenId(isOpen ? null : game.id)}
                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>{game.icon} {game.title}</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div className="shBody" style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px' }}>
                  <Suspense fallback={<div style={{ color: 'var(--accent)', fontSize: 12 }}>cargando_juego...</div>}>
                    <GameComponent />
                  </Suspense>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
