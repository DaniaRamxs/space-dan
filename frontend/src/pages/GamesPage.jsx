import { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { animate as animeAnimate, stagger } from 'animejs';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { unlockAchievement } from '../hooks/useAchievements';
import { useAuthContext } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
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
const TypeBlitz = lazy(() => import('../components/TypeBlitz'));
const TronGame = lazy(() => import('../components/TronGame'));
const LightsOut = lazy(() => import('../components/LightsOut'));
const OneButtonHero = lazy(() => import('../components/OneButtonHero'));
const NeonReflex = lazy(() => import('../components/NeonReflex'));
const GravityFlip = lazy(() => import('../components/GravityFlip'));
const NodeChain = lazy(() => import('../components/NodeChain'));
const TenSecondsHero = lazy(() => import('../components/TenSecondsHero'));
const PerfectTap = lazy(() => import('../components/PerfectTap'));
const SplitControl = lazy(() => import('../components/SplitControl'));
const PhaseRunner = lazy(() => import('../components/PhaseRunner'));
const MagnetDash = lazy(() => import('../components/MagnetDash'));
const EchoTiming = lazy(() => import('../components/EchoTiming'));
// Casino — Batch 1
const CasinoBlackjack = lazy(() => import('../components/CasinoBlackjack'));
const CosmicDice = lazy(() => import('../components/CosmicDice'));
const AsteroidCrash = lazy(() => import('../components/AsteroidCrash'));
const SpaceMiner = lazy(() => import('../components/SpaceMiner'));
const OrbitalSlots = lazy(() => import('../components/OrbitalSlots'));
const QuantumFlip = lazy(() => import('../components/QuantumFlip'));
const GalaxyLadder = lazy(() => import('../components/GalaxyLadder'));
const AlienInvasion = lazy(() => import('../components/AlienInvasion'));
const RocketJump = lazy(() => import('../components/RocketJump'));
const MemoryGalaxy = lazy(() => import('../components/MemoryGalaxy'));
// Casino — Batch 2
const NebulaSniper = lazy(() => import('../components/NebulaSniper'));
const PulsarRoulette = lazy(() => import('../components/PulsarRoulette'));
const HiLoCards = lazy(() => import('../components/HiLoCards'));
const TimeBomb = lazy(() => import('../components/TimeBomb'));
const GravityWave = lazy(() => import('../components/GravityWave'));
const CosmicWheel = lazy(() => import('../components/CosmicWheel'));
const StarSudoku = lazy(() => import('../components/StarSudoku'));
const OraclePrediction = lazy(() => import('../components/OraclePrediction'));
const PowerSurge = lazy(() => import('../components/PowerSurge'));
const PlanetAuction = lazy(() => import('../components/PlanetAuction'));
const BlackHolePull = lazy(() => import('../components/BlackHolePull'));
const AlienPoker = lazy(() => import('../components/AlienPoker'));
const CasinoLeaderboard = lazy(() => import('../components/CasinoLeaderboard'));


const GAMES = [
  { id: 'snake', icon: '🐍', title: 'snake', component: SnakeGame, category: 'Arcade', isImmersive: true },
  { id: 'memory', icon: '🃏', title: 'memory', component: MemoryGame, category: 'Puzzle', isImmersive: true },
  { id: 'ttt', icon: '❌', title: 'tic tac toe', component: TicTacToe, category: 'Table', isImmersive: true },
  { id: 'whack', icon: '🐭', title: 'whack-a-mole', component: WhackAMole, category: 'Skill', isImmersive: true },
  { id: 'color', icon: '🎨', title: 'color match', component: ColorMatch, category: 'Puzzle', isImmersive: true },
  { id: 'reaction', icon: '⚡', title: 'reaction time', component: ReactionTime, category: 'Skill', isImmersive: true },
  { id: '2048', icon: '🔢', title: '2048', component: Game2048, category: 'Puzzle', isImmersive: true },
  { id: 'blackjack', icon: '🃠', title: 'blackjack', component: Blackjack, category: 'Table', isImmersive: true },
  { id: 'puzzle', icon: '🧩', title: 'sliding puzzle', component: SlidingPuzzle, category: 'Puzzle', isImmersive: true },
  { id: 'pong', icon: '🏓', title: 'pong', component: Pong, category: 'Arcade', isImmersive: true },
  { id: 'invaders', icon: '👾', title: 'space invaders', component: SpaceInvaders, category: 'Arcade', isImmersive: true },
  { id: 'breakout', icon: '🧱', title: 'breakout', component: Breakout, category: 'Arcade', isImmersive: true },
  { id: 'asteroids', icon: '🚀', title: 'asteroids', component: Asteroids, category: 'Arcade', isImmersive: true },
  { id: 'tetris', icon: '🟦', title: 'tetris', component: TetrisGame, category: 'Arcade', isImmersive: true },
  { id: 'flappy', icon: '🐦', title: 'flappy bird', component: FlappyBird, category: 'Skill', isImmersive: true },
  { id: 'mines', icon: '💣', title: 'buscaminas', component: Minesweeper, category: 'Puzzle', isImmersive: true },
  { id: 'dino', icon: '🦕', title: 'dino runner', component: DinoRunner, category: 'Skill', isImmersive: true },
  { id: 'connect4', icon: '🔴', title: 'connect four', component: ConnectFour, category: 'Table', isImmersive: true },
  { id: 'simon', icon: '🔵', title: 'simon says', component: SimonSays, category: 'Skill', isImmersive: true },
  { id: 'cookie', icon: '🍪', title: 'cookie clicker', component: CookieClicker, category: 'Arcade', isImmersive: true },
  { id: 'maze', icon: '🌀', title: 'maze', component: MazeGame, category: 'Puzzle', isImmersive: true },
  { id: 'catch', icon: '🧳', title: 'catch game', component: CatchGame, category: 'Skill', isImmersive: true },
  { id: 'dodge', icon: '💨', title: 'dodge game', component: DodgeGame, category: 'Skill', isImmersive: true },
  { id: 'typeblitz', icon: '⌨️', title: 'type blitz', component: TypeBlitz, category: 'Skill', isImmersive: true },
  { id: 'tron', icon: '📹', title: 'tron cycles', component: TronGame, category: 'Arcade', isImmersive: true },
  { id: 'lightsout', icon: '💡', title: 'lights out', component: LightsOut, category: 'Puzzle', isImmersive: true },
  { id: 'hero', icon: '🏃‍♂️', title: 'neon dash', component: OneButtonHero, category: 'Arcade', isImmersive: true },
  { id: 'reflex', icon: '✨', title: 'neon reflex', component: NeonReflex, category: 'Skill', isImmersive: true },
  { id: 'gravityflip', icon: '🌌', title: 'gravity flip', component: GravityFlip, category: 'Skill', isImmersive: true },
  { id: 'nodechain', icon: '🔌', title: 'node chain', component: NodeChain, category: 'Puzzle', isImmersive: true },
  { id: '10sec', icon: '⏱️', title: '10s hero', component: TenSecondsHero, category: 'Skill', isImmersive: true },
  { id: 'perfectap', icon: '🎯', title: 'perfect tap', component: PerfectTap, category: 'Skill', isImmersive: true },
  { id: 'splitcontrol', icon: '🎛️', title: 'split control', component: SplitControl, category: 'Skill', isImmersive: true },
  { id: 'phaserunner', icon: '⚡', title: 'phase runner', component: PhaseRunner, category: 'Skill', isImmersive: true },
  { id: 'magnetdash', icon: '🧲', title: 'magnet dash', component: MagnetDash, category: 'Skill', isImmersive: true },
  { id: 'echotiming', icon: '📡', title: 'echo timing', component: EchoTiming, category: 'Skill', isImmersive: true },
  // Casino
  { id: 'casino-blackjack', icon: '🃠', title: 'blackjack', component: CasinoBlackjack, category: 'Casino', isImmersive: true },
  { id: 'cosmic-dice', icon: '🎲', title: 'cosmic dice', component: CosmicDice, category: 'Casino', isImmersive: true },
  { id: 'asteroid-crash', icon: '🚀', title: 'asteroid crash', component: AsteroidCrash, category: 'Casino', isImmersive: true },
  { id: 'space-miner', icon: '⛏️', title: 'space miner', component: SpaceMiner, category: 'Casino', isImmersive: true },
  { id: 'orbital-slots', icon: '🎰', title: 'orbital slots', component: OrbitalSlots, category: 'Casino', isImmersive: true },
  { id: 'quantum-flip', icon: '🪙', title: 'quantum flip', component: QuantumFlip, category: 'Casino', isImmersive: true },
  { id: 'galaxy-ladder', icon: '🪜', title: 'galaxy ladder', component: GalaxyLadder, category: 'Casino', isImmersive: true },
  { id: 'alien-invasion', icon: '👾', title: 'alien invasion', component: AlienInvasion, category: 'Casino', isImmersive: true },
  { id: 'rocket-jump', icon: '🛸', title: 'rocket jump', component: RocketJump, category: 'Casino', isImmersive: true },
  { id: 'memory-galaxy', icon: '🧠', title: 'memory galaxy', component: MemoryGalaxy, category: 'Casino', isImmersive: true },
  { id: 'nebula-sniper', icon: '🎯', title: 'nebula sniper', component: NebulaSniper, category: 'Casino', isImmersive: true },
  { id: 'pulsar-roulette', icon: '🌀', title: 'pulsar roulette', component: PulsarRoulette, category: 'Casino', isImmersive: true },
  { id: 'hilo-cards', icon: '🃏', title: 'hi-lo cards', component: HiLoCards, category: 'Casino', isImmersive: true },
  { id: 'time-bomb', icon: '💣', title: 'time bomb', component: TimeBomb, category: 'Casino', isImmersive: true },
  { id: 'gravity-wave', icon: '🌊', title: 'gravity wave', component: GravityWave, category: 'Casino', isImmersive: true },
  { id: 'cosmic-wheel', icon: '🎡', title: 'cosmic wheel', component: CosmicWheel, category: 'Casino', isImmersive: true },
  { id: 'star-sudoku', icon: '🧩', title: 'star sudoku', component: StarSudoku, category: 'Casino', isImmersive: true },
  { id: 'oracle-prediction', icon: '🔮', title: 'oracle prediction', component: OraclePrediction, category: 'Casino', isImmersive: true },
  { id: 'power-surge', icon: '⚡', title: 'power surge', component: PowerSurge, category: 'Casino', isImmersive: true },
  { id: 'planet-auction', icon: '🪐', title: 'planet auction', component: PlanetAuction, category: 'Casino', isImmersive: true },
  { id: 'black-hole-pull', icon: '🕳️', title: 'black hole pull', component: BlackHolePull, category: 'Casino', isImmersive: true },
  { id: 'alien-poker', icon: '🎭', title: 'alien poker', component: AlienPoker, category: 'Casino', isImmersive: true },
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
  const { gameId } = useParams();
  const navigate = useNavigate();

  const { user, profile } = useAuthContext();
  const { awardCoins } = useEconomy();
  const { claimSeasonReward, season, refreshSeason } = useSeason();

  const [openId, setOpenId] = useState(gameId || null);

  useEffect(() => {
    setOpenId(gameId || null);
  }, [gameId]);
  const [coinToast, setCoinToast] = useState(null);
  const [lbKey, setLbKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [userStats, setUserStats] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [mockFeedItems, setMockFeedItems] = useState([
    "Dan subió al #4 en Snake 🐍",
    "Luna rompió récord en Asteroids 🚀",
    "Alex ganó 3 partidas seguidas en Connect4 🔴",
    "Max dominó el Puzzle 🧩"
  ]);
  const [scale, setScale] = useState(1);

  // Pilot rank name derivation
  const pilotRank = useMemo(() => {
    const xp = (profile?.balance || 0) + (userStats.length * 50); // Rough estimation for dashboard flair
    const level = Math.max(1, Math.floor(0.1 * Math.sqrt(xp)));
    const rankNames = ['RECLUTA_BASE', 'EXPLORADOR_C', 'CAZADOR_META', 'PILOTO_ESTAR', 'VANGUARDIA_V', 'COMANDANTE_X', 'ARQUITECTO_S', 'LEYENDA_Z', 'ENTIDAD_ASTRA'];
    return rankNames[Math.min(Math.floor(level / 3), rankNames.length - 1)];
  }, [profile, userStats]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameOverlayRef = useRef(null);
  const toastTimer = useRef(null);
  const openIdRef = useRef(null);

  useEffect(() => { arcadeAudio.toggle(soundOn); }, [soundOn]);

  // Fullscreen para Android
  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      try {
        await gameOverlayRef.current?.requestFullscreen?.();
        if (Capacitor.isNativePlatform()) {
          const { StatusBar } = await import('@capacitor/status-bar');
          await StatusBar.hide();
        }
      } catch (e) {
        console.warn('[Fullscreen] enter:', e);
      }
    } else {
      try {
        await document.exitFullscreen?.();
        if (Capacitor.isNativePlatform()) {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.show();
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#050510' });
        }
      } catch (e) {
        console.warn('[Fullscreen] exit:', e);
      }
    }
  }, [isFullscreen]);

  // Sincronizar estado con el evento nativo de fullscreen
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Salir de fullscreen automáticamente al cerrar el juego
  useEffect(() => {
    if (!openId && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => { });
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          StatusBar.show();
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: '#050510' });
        }).catch(() => { });
      }
    }
  }, [openId]);

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

  // Anime.js Staggered Entrance (Optimization)
  useEffect(() => {
    if (!openId) {
      const timeout = setTimeout(() => {
        animeAnimate('.game-card-anim', {
          opacity: [0, 1],
          translateY: [20, 0],
          delay: stagger(30, { start: 100 }),
          duration: 600,
          easing: 'easeOutQuart'
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [openId, filterCat, searchTerm]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 450) setScale(Math.min(1, (width - 40) / 400));
      else setScale(1);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const events = data.map(s => `🎰 ${s.profiles?.username || 'Explorador'} marcó ${s.score} en ${s.game_id.toUpperCase()}`);
        setMockFeedItems(prev => [...events, ...prev].slice(0, 10));
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

  useEffect(() => {
    openIdRef.current = openId;
    if (openId) {
      document.body.style.overflow = 'hidden';
      if (window.innerWidth <= 820) {
        const container = document.querySelector('.gardenContent');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'instant' });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [openId]);

  const showCoinToast = useCallback((msg) => {
    setCoinToast(msg);
    arcadeAudio.play('coin');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCoinToast(null), 2200);
  }, []);

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
      const gId = e.detail?.gameId || openIdRef.current;
      if (user && gId && score != null) {
        saveScore(user.id, gId, score).then(() => {
          setLbKey(k => k + 1);
          refreshSeason();
        });
      }
    };
    window.addEventListener('dan:game-score', onScore);
    return () => window.removeEventListener('dan:game-score', onScore);
  }, [user, claimSeasonReward, showCoinToast, refreshSeason]);

  const handleToggle = (gameIdParaMover) => {
    arcadeAudio.play('select');
    if (gameIdParaMover) {
      navigate(`/game/${gameIdParaMover}`);
      const isNew = markGamePlayed(gameIdParaMover);
      if (isNew) {
        awardCoins(5);
        showCoinToast('+5 ◈ juego nuevo!');
        if (loadPlayedGames().size >= 5) unlockAchievement('gamer');
      }
      if (window.innerWidth >= 768 && !Capacitor.isNativePlatform()) {
        setTimeout(() => {
          gameOverlayRef.current?.requestFullscreen?.().catch(() => { });
        }, 150);
      }
    } else {
      navigate('/games');
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

  const renderGameCard = (game, i) => {
    const isPlayed = playedSet.has(game.id);
    const stats = userStats.find(s => s.game_id === game.id);
    return (
      <div
        key={game.id}
        className={`game-card-anim gameCard ${getTierClass(stats?.game_level || 0)} opacity-0`}
        onClick={() => handleToggle(game.id)}
        style={{ border: isPlayed ? '1px solid rgba(255,255,255,0.05)' : '1px dotted var(--accent)', transition: 'all 0.2s', padding: 16 }}
      >
        {!isPlayed && <span className="gameCardBadge">NUEVO</span>}
        {stats?.game_level > 0 && (
          <span className={`gameCardLevel ${stats.game_level >= 5 ? 'high-level' : ''}`} title="Nivel en este juego">Lv.{stats.game_level}</span>
        )}
        {stats?.user_position && (
          <span className="gameCardRank" title="Tu posición en el ranking">#{stats.user_position}</span>
        )}
        <span className="gameCardIcon" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>{game.icon}</span>
        <span className="gameCardTitle">{game.title}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{game.category} • 🟢 12 online</span>
      </div>
    );
  };

  return (
    <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans flex flex-col pt-4 md:pt-10 px-0 md:px-6 relative">
      {/* Background content — unmounted while a game is running to free GPU */}
      {!openId && (<>

        {/* ARCADE HERO HEADER - RETRO FUTURISTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 15, position: 'relative',
          padding: '20px 16px', marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(236,72,153,0.05) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(0,229,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.5))' }}>🕹️</span>
                <h1 style={{ 
                  fontSize: '2rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  margin: 0, 
                  background: 'linear-gradient(135deg, #00e5ff 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: 2,
                  textShadow: '0 0 20px rgba(0,229,255,0.3)'
                }}>
                  ARCADE
                </h1>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#00e5ff', opacity: 0.9, fontWeight: 700, letterSpacing: 0.5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(0,229,255,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.2)' }}>
                  LVL {Math.max(1, Math.floor(0.1 * Math.sqrt((profile?.balance || 0) + (userStats.length * 50))))}
                </span>
                <span style={{ background: 'rgba(236,72,153,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.2)' }}>
                  #{season?.rank || '—'} GLOBAL
                </span>
                {(season?.active_boosts?.night || season?.active_boosts?.weekend) && (
                  <span style={{ background: 'rgba(255,215,0,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' }}>
                    ⚡ BOOST ACTIVO
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setSoundOn(!soundOn)}
                title="Efectos de Sonido"
                style={{ 
                  background: soundOn ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)', 
                  border: soundOn ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', 
                  fontSize: '1.1rem', 
                  width: 42, 
                  height: 42, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: soundOn ? '0 0 15px rgba(0,229,255,0.3)' : 'none'
                }}
              >
                {soundOn ? '🔊' : '🔈'}
              </button>
            </div>
          </div>
        </div>

        {/* GUEST WARNING */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bentoItem"
            style={{
              background: 'rgba(255,165,0,0.1)',
              border: '1px solid rgba(255,165,0,0.3)',
              padding: '12px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: '20px'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ffa500', textTransform: 'uppercase', letterSpacing: 1 }}>Modo Invitado</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8, color: '#fff' }}>
                Inicia sesión para que tus puntajes se guarden en el ranking global y recibas recompensas.
              </div>
            </div>
          </motion.div>
        )}

        {/* CENTRAL QUICK PLAY AREA */}
        <div style={{ padding: '0 16px', marginBottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,229,255,0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSurpriseMe}
            style={{
              width: '100%', maxWidth: 400, padding: '20px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(236,72,153,0.05) 100%)',
              border: '1px solid rgba(0,229,255,0.2)', borderRadius: 24, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', lineHeight: 1 }}>🎮</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: 1 }}>QUICK MATCH</span>
          </motion.button>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Arcade', 'Puzzle', 'Skill', 'Table'].map(cat => (
              <button
                key={cat} onClick={() => { setFilterCat(cat); arcadeAudio.play('blip'); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px 16px', borderRadius: 20, color: '#aaa', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* SOCIAL TICKER / COMUNIDAD */}
        <div className="mx-4 md:mx-0" style={{ marginBottom: 35, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10, letterSpacing: 1 }}>📡 Actividad Reciente</div>
          <div className="liveTickerContainer" style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <div className="liveTicker">
              {[...mockFeedItems, ...mockFeedItems].map((text, i) => (
                <span key={i} className="tickerItem" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: 20 }}>
                  <img src="/default-avatar.png" alt="av" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* TRENDING GAMES */}
        {filterCat === 'All' && searchTerm === '' && filteredGames.length >= 4 && (
          <div className="px-4 md:px-0" style={{ marginBottom: 35 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🔥 Trending Ahora</h3>
            <div className="gamesGrid">
              {filteredGames.slice(0, 4).map(renderGameCard)}
            </div>
          </div>
        )}

        {/* RECOMMENDED GAMES */}
        {filterCat === 'All' && searchTerm === '' && filteredGames.length >= 8 && (
          <div className="px-4 md:px-0" style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>⭐ Recomendados para ti</h3>
            <div className="gamesGrid">
              {filteredGames.slice(4, 8).map(renderGameCard)}
            </div>
          </div>
        )}

        {/* FILTERS & ALL GAMES */}
        <div className="px-4 md:px-0" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🎮 Explorar Arcade</h3>
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
          <div className="mobile-scroll-x" style={{ paddingBottom: 10 }}>
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

        {/* CASINO LEADERBOARD */}
        {filterCat === 'Casino' && (
          <div className="px-4 md:px-0" style={{ marginBottom: 24 }}>
            <Suspense fallback={null}>
              <CasinoLeaderboard />
            </Suspense>
          </div>
        )}

        {/* GRID */}
        {filteredGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.3 }}>
            <div style={{ fontSize: '4rem', marginBottom: 15 }}>🛸</div>
            <p style={{ fontWeight: 'bold' }}>No se detectaron señales de ese juego.</p>
          </div>
        ) : (
          <div className="gamesGrid px-4 md:px-0" style={{ marginTop: 0 }}>
            {filteredGames.map(renderGameCard)}
          </div>
        )}

      </>)}

      {/* FULLSCREEN GAME OVERLAY */}
      <AnimatePresence>
        {openId && activeGame && (
          <motion.div
            ref={gameOverlayRef}
            className={`gameOverlay ${activeGame.isImmersive ? 'immersive' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {/* Header always hidden if immersive or if big screen (where sidebar handles info) */}
            {!activeGame.isImmersive && (
              <div className={`gameOverlayHeader ${window.innerWidth >= 1024 ? 'hidden' : ''}`} style={{ background: 'rgba(5,5,20,0.95)', display: window.innerWidth >= 1024 ? 'none' : 'flex' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={{ fontSize: '2rem' }}>{activeGame.icon}</div>
                  <div>
                    <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: '1.2rem' }}>{activeGame.title}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: 1 }}>SISTEMA_ARCADE_V2.0</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="gameFullscreenBtn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    className="gameCloseBtn"
                    onClick={() => {
                      arcadeAudio.play('close');
                      navigate('/games');
                    }}
                    style={{ position: 'relative', zIndex: 5001, background: '#ff4444' }}
                  >
                    ESC
                  </button>
                </div>
              </div>
            )}

            <div className={`gameOverlayContent ${activeGame.isImmersive ? 'immersive' : ''}`}>
              <div className={`gameScale ${activeGame.isImmersive ? 'immersive' : ''}`} style={{ '--game-scale': scale }}>
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ color: 'var(--accent)', fontSize: 14, fontFamily: 'monospace' }}>CARGANDO_ASSETS...</div>}>
                    {GameComponent && <GameComponent />}
                  </Suspense>
                </ErrorBoundary>
              </div>

              {!activeGame.isImmersive && (
                <div className="gameSidebar">
                  {/* Game Stats Bar */}
                  <div style={{
                    display: 'flex', gap: 15, background: 'rgba(255,110,180,0.05)', padding: '15px 25px', borderRadius: '20px',
                    border: '1px solid rgba(255,110,180,0.2)', width: '100%',
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

                  {!activeGame.isImmersive && (
                    <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
                      <Leaderboard gameId={activeGame.id} refreshKey={lbKey} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
