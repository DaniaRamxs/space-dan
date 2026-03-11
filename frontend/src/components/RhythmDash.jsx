import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LANES = 4;
const KEYS = ['d', 'f', 'j', 'k'];
const NOTE_SPEED = 3;
const PERFECT_WINDOW = 50;
const GOOD_WINDOW = 100;
const OK_WINDOW = 150;

const PATTERNS = [
  [0, 1, 2, 3, 0, 2, 1, 3, 0, 1, 3, 2],
  [0, 0, 1, 1, 2, 2, 3, 3, 0, 2, 1, 3],
  [3, 2, 1, 0, 3, 1, 2, 0, 3, 2, 0, 1],
  [0, 1, 0, 2, 1, 3, 2, 0, 3, 1, 2, 3],
];

export default function RhythmDash() {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notes, setNotes] = useState([]);
  const [pressedKeys, setPressedKeys] = useState({});
  const [feedback, setFeedback] = useState([]);
  const [health, setHealth] = useState(100);
  const [difficulty, setDifficulty] = useState(1);
  
  const gameLoopRef = useRef(null);
  const noteIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const startTimeRef = useRef(0);
  const patternIndexRef = useRef(0);
  const noteInPatternRef = useRef(0);

  const addFeedback = useCallback((text, lane) => {
    const id = Date.now() + Math.random();
    setFeedback(prev => [...prev, { id, text, lane }]);
    setTimeout(() => {
      setFeedback(prev => prev.filter(f => f.id !== id));
    }, 1000);
  }, []);

  const spawnNote = useCallback(() => {
    const pattern = PATTERNS[patternIndexRef.current % PATTERNS.length];
    const lane = pattern[noteInPatternRef.current % pattern.length];
    
    noteInPatternRef.current++;
    if (noteInPatternRef.current >= pattern.length) {
      noteInPatternRef.current = 0;
      patternIndexRef.current++;
    }

    const newNote = {
      id: noteIdRef.current++,
      lane,
      y: -50,
      hit: false
    };
    
    setNotes(prev => [...prev, newNote]);
  }, []);

  const checkHit = useCallback((lane) => {
    const targetY = 500;
    const notesInLane = notes.filter(n => n.lane === lane && !n.hit);
    
    if (notesInLane.length === 0) {
      setCombo(0);
      setHealth(h => Math.max(0, h - 5));
      addFeedback('MISS', lane);
      return;
    }

    const closest = notesInLane.reduce((prev, curr) => 
      Math.abs(curr.y - targetY) < Math.abs(prev.y - targetY) ? curr : prev
    );

    const distance = Math.abs(closest.y - targetY);
    
    if (distance < PERFECT_WINDOW) {
      setScore(s => s + 100 * (combo + 1));
      setCombo(c => c + 1);
      addFeedback('PERFECT!', lane);
      closest.hit = true;
    } else if (distance < GOOD_WINDOW) {
      setScore(s => s + 50 * (combo + 1));
      setCombo(c => c + 1);
      addFeedback('GOOD', lane);
      closest.hit = true;
    } else if (distance < OK_WINDOW) {
      setScore(s => s + 25);
      setCombo(0);
      addFeedback('OK', lane);
      closest.hit = true;
    } else {
      setCombo(0);
      setHealth(h => Math.max(0, h - 5));
      addFeedback('MISS', lane);
    }
  }, [notes, combo, addFeedback]);

  const gameLoop = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    
    // Spawn notes based on difficulty
    const spawnInterval = Math.max(400, 800 - difficulty * 50);
    if (now - lastSpawnRef.current > spawnInterval) {
      spawnNote();
      lastSpawnRef.current = now;
    }

    // Move notes
    setNotes(prev => {
      const updated = prev.map(note => ({
        ...note,
        y: note.y + NOTE_SPEED * (1 + difficulty * 0.1)
      }));

      // Remove missed notes
      const filtered = updated.filter(note => {
        if (note.y > 600 && !note.hit) {
          setCombo(0);
          setHealth(h => Math.max(0, h - 10));
          return false;
        }
        return note.y < 650;
      });

      return filtered;
    });

    // Increase difficulty over time
    if (elapsed > 15000 && difficulty < 5) {
      setDifficulty(d => Math.min(5, d + 0.1));
    }
  }, [spawnNote, difficulty]);

  useEffect(() => {
    if (gameState === 'playing' && gameLoopRef.current === null) {
      const loop = () => {
        gameLoop();
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }
    
    if (gameState !== 'playing' && gameLoopRef.current !== null) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === 'playing') {
      startTimeRef.current = Date.now();
      lastSpawnRef.current = Date.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('gameover');
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      
      window.dispatchEvent(new CustomEvent('dan:game-score', {
        detail: { score, gameId: 'rhythm-dash', isHighScore: true }
      }));
    }
  }, [health, gameState, score]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      const key = e.key.toLowerCase();
      const laneIndex = KEYS.indexOf(key);
      
      if (laneIndex !== -1 && !pressedKeys[key]) {
        setPressedKeys(prev => ({ ...prev, [key]: true }));
        checkHit(laneIndex);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (KEYS.includes(key)) {
        setPressedKeys(prev => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, checkHit, pressedKeys]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setNotes([]);
    setHealth(100);
    setDifficulty(1);
    noteIdRef.current = 0;
    patternIndexRef.current = 0;
    noteInPatternRef.current = 0;
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setNotes([]);
    setHealth(100);
    setDifficulty(1);
  };

  if (gameState === 'menu') {
    return (
      <div style={{
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: 20,
        textAlign: 'center',
        color: '#fff'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(0,229,255,0.1) 100%)',
            borderRadius: 24,
            padding: 40,
            border: '1px solid rgba(236,72,153,0.2)'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎵</div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ec4899 0%, #00e5ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 20
          }}>
            RHYTHM DASH
          </h1>
          <p style={{ opacity: 0.7, marginBottom: 30, fontSize: '0.9rem' }}>
            Presiona <span style={{ color: '#ec4899', fontWeight: 'bold' }}>D F J K</span> al ritmo de las notas
          </p>
          
          <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'center', gap: 10 }}>
            {KEYS.map((key, i) => (
              <div key={i} style={{
                width: 60,
                height: 60,
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {key}
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #00e5ff 100%)',
              border: 'none',
              padding: '16px 48px',
              borderRadius: 16,
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: '0 10px 30px rgba(236,72,153,0.3)'
            }}
          >
            JUGAR
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div style={{
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: 20,
        textAlign: 'center',
        color: '#fff'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(0,229,255,0.1) 100%)',
            borderRadius: 24,
            padding: 40,
            border: '1px solid rgba(236,72,153,0.2)'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎮</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 30 }}>GAME OVER</h2>
          
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 10 }}>SCORE FINAL</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00e5ff' }}>{score.toLocaleString()}</div>
            
            <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>MAX COMBO</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ec4899' }}>{maxCombo}x</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>DIFICULTAD</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700' }}>{difficulty.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <button
            onClick={resetGame}
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #00e5ff 100%)',
              border: 'none',
              padding: '16px 48px',
              borderRadius: 16,
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            VOLVER A JUGAR
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      height: 600,
      margin: '0 auto',
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(20,0,40,0.9) 100%)',
      borderRadius: 24,
      overflow: 'hidden',
      border: '2px solid rgba(236,72,153,0.3)'
    }}>
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 10,
        color: '#fff'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>SCORE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff' }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>COMBO</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: combo > 10 ? '#ffd700' : '#ec4899' }}>{combo}x</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>HEALTH</div>
          <div style={{
            width: 100,
            height: 10,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 5,
            overflow: 'hidden',
            marginTop: 5
          }}>
            <div style={{
              width: `${health}%`,
              height: '100%',
              background: health > 50 ? '#00ff88' : health > 25 ? '#ffd700' : '#ff4444',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      </div>

      {/* Lanes */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        display: 'flex'
      }}>
        {KEYS.map((key, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRight: i < LANES - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              position: 'relative',
              background: pressedKeys[key] ? 'rgba(236,72,153,0.2)' : 'transparent',
              transition: 'background 0.1s'
            }}
          >
            {/* Hit zone */}
            <div style={{
              position: 'absolute',
              bottom: 100,
              left: 0,
              right: 0,
              height: 80,
              background: 'rgba(0,229,255,0.1)',
              border: '2px solid rgba(0,229,255,0.3)',
              borderRadius: 8
            }} />
            
            {/* Key label */}
            <div style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: pressedKeys[key] ? '#ec4899' : 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              transition: 'color 0.1s'
            }}>
              {key}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <AnimatePresence>
        {notes.map(note => (
          <motion.div
            key={note.id}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              position: 'absolute',
              left: `${(note.lane / LANES) * 100 + 5}%`,
              top: note.y,
              width: `${(1 / LANES) * 100 - 10}%`,
              height: 40,
              background: note.hit ? 'rgba(0,255,136,0.8)' : 'linear-gradient(135deg, #ec4899 0%, #00e5ff 100%)',
              borderRadius: 8,
              boxShadow: '0 4px 15px rgba(236,72,153,0.5)',
              transition: 'background 0.1s'
            }}
          />
        ))}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {feedback.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              position: 'absolute',
              left: `${(f.lane / LANES) * 100 + 12.5}%`,
              top: 400,
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: f.text === 'PERFECT!' ? '#00ff88' : f.text === 'GOOD' ? '#00e5ff' : f.text === 'OK' ? '#ffd700' : '#ff4444',
              pointerEvents: 'none',
              textShadow: '0 0 10px currentColor'
            }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
