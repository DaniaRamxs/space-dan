import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const PLANETS = [
  { id: 'p1', name: 'Zeta-9', type: 'rocoso', icon: '🪨', maxVal: 3 },
  { id: 'p2', name: 'Nova Prime', type: 'gaseoso', icon: '☁️', maxVal: 5 },
  { id: 'p3', name: 'Hydra Aqua', type: 'oceánico', icon: '🌊', maxVal: 8 },
  { id: 'p4', name: 'Aurelia', type: 'oro', icon: '✨', maxVal: 15 },
  { id: 'p5', name: 'Void Core', type: 'agujero negro', icon: '🕳️', maxVal: 25 },
];

function GameInner({ bet, balance, finishGame }) {
  const { triggerHaptic, triggerFloatingText, spawnParticles } = useArcadeSystems();

  const [planet, setPlanet] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [biddersLeft, setBiddersLeft] = useState(4);
  const [auctionStatus, setAuctionStatus] = useState('bidding'); // 'bidding', 'sold_to_player', 'sold_to_ai'
  const [aiTimer, setAiTimer] = useState(0);
  const [winnerProfit, setWinnerProfit] = useState(0);

  // Seleccionar planeta random al inicio
  useEffect(() => {
    const randPlanet = PLANETS[Math.floor(Math.random() * PLANETS.length)];
    setPlanet(randPlanet);
    // La puja base siempre arranca un poco por encima o igual a la apuesta del jugador para forzar compromiso
    setCurrentBid(bet);
  }, [bet]);

  // Lógica de pujas de la IA
  useEffect(() => {
    if (auctionStatus !== 'bidding' || biddersLeft <= 0 || !planet) return;

    const timer = setTimeout(() => {
      // Un 40% de probabilidad de que la IA se rinda si el precio sube de cierto umbral relativo a la apuesta base
      const threshold = bet * (planet.maxVal * 0.4);
      const dropChance = currentBid > threshold ? 0.6 : 0.2;

      if (Math.random() < dropChance) {
        // Un bajista se rinde
        setBiddersLeft(prev => prev - 1);
        triggerFloatingText('IA se retira', '50%', '30%', '#ff5252');
      } else {
        // La IA sube la puja
        const raise = Math.floor(bet * (Math.random() * 0.5 + 0.1));
        setCurrentBid(prev => prev + raise);
        triggerFloatingText('IA sube puja', '50%', '30%', '#fff');
        triggerHaptic('light');
      }
    }, 1500 + Math.random() * 2000); // Tiempos aleatorios de la IA

    return () => clearTimeout(timer);
  }, [currentBid, auctionStatus, biddersLeft, planet, bet, triggerFloatingText, triggerHaptic]);

  // Cuando no quedan IAs
  useEffect(() => {
    if (biddersLeft === 0 && auctionStatus === 'bidding') {
      setAuctionStatus('sold_to_player');
      triggerHaptic('heavy');
      spawnParticles('50%', '50%', '#00e5ff', 40);

      // Calcular ganancia real basado en el valor "oculto" multiplicador máximo del planeta
      // A veces el planeta vale menos de lo que pusiste, a veces mucho más.
      setTimeout(() => {
        const realMultiplier = (Math.random() * planet.maxVal) + 0.1;
        const realValue = Math.floor(bet * realMultiplier);

        // Si el valor real es menor que la puja actual, pierdes dinero (Retorna 0 o fracción)
        if (realValue < currentBid) {
          finishGame(0, `Compraste ${planet.name} muy caro. Valor real: ◈${realValue}`);
        } else {
          // Ganaste dinero. Retornamos el multiplicador basado en la ganancia neta respecto a tu bet original
          const profitMultiplier = realValue / bet;
          // Cap maximo de x20 para no romper econ
          finishGame(Math.min(20, profitMultiplier), `¡Ganga! ${planet.name} valía ◈${realValue}`);
        }
      }, 2000);
    }
  }, [biddersLeft, auctionStatus, currentBid, bet, planet, finishGame, triggerHaptic, spawnParticles]);

  const handleBid = () => {
    if (auctionStatus !== 'bidding') return;

    // El jugador intenta subir la puja mínimamente base
    const raise = Math.floor(bet * 0.2);
    setCurrentBid(prev => prev + raise);
    triggerHaptic('medium');
    spawnParticles('50%', '70%', '#f5c518', 10);

    // Reiniciar timer de la IA intencionalmente para meter presión
    setBiddersLeft(prev => prev);
  };

  const handlePass = () => {
    if (auctionStatus !== 'bidding') return;
    setAuctionStatus('sold_to_ai');
    triggerHaptic('heavy');
    setTimeout(() => {
      finishGame(0, 'Te retiraste de la subasta.');
    }, 1500);
  };

  if (!planet) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
          <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}>
            {planet.icon}
          </div>
        </motion.div>
        <h3 style={{ margin: '12px 0 4px', fontSize: '1.4rem', color: '#fff' }}>{planet.name}</h3>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>
          Tipo: {planet.type}
        </p>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px 40px', borderRadius: 20, textAlign: 'center', width: '80%'
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: 1, marginBottom: 8 }}>
          PUJA ACTUAL
        </div>
        <motion.div
          key={currentBid}
          initial={{ scale: 1.2, color: '#00e5ff' }}
          animate={{ scale: 1, color: '#f5c518' }}
          style={{ fontSize: '2.5rem', fontWeight: 900 }}
        >
          ◈ {currentBid.toLocaleString()}
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
        👤 Postores restantes de IA: <strong style={{ color: biddersLeft === 0 ? '#39ff14' : '#ffea00' }}>{biddersLeft}</strong>
      </div>

      {auctionStatus === 'bidding' && (
        <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 20 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePass}
            style={{
              flex: 1, padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#fff', fontSize: '1rem', fontWeight: 700
            }}
          >🖐️ PASAR</motion.button>

          <motion.button whileTap={{ scale: 0.95 }} onClick={handleBid}
            style={{
              flex: 1, padding: 16, borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
              color: '#000', fontSize: '1rem', fontWeight: 900
            }}
          >💰 PUJAR +◈{Math.floor(bet * 0.2)}</motion.button>
        </div>
      )}

      {auctionStatus === 'sold_to_player' && (
        <div style={{ color: '#00e5ff', fontSize: '1.2rem', fontWeight: 900, animation: 'pulse 1s infinite' }}>
          ¡PLANETA OBTENIDO! Tasando valor real...
        </div>
      )}

      {auctionStatus === 'sold_to_ai' && (
        <div style={{ color: '#ff5252', fontSize: '1.2rem', fontWeight: 900 }}>
          Vendido a postor anónimo.
        </div>
      )}

    </div>
  );
}

export default function PlanetAuction() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('planet-auction', 'Planet Auction');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading} isVIP={isVIP}
            title="Planet Auction" icon="🪐"
            description="Puja contra la IA para comprar planetas a ciegas. Si pagas más de lo que vale, pierdes. Si consigues una ganga, multiplicas tu ganancia."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <GameInner bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
