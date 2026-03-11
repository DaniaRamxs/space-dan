import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#ff6b9d', '#00e5ff', '#ffd700', '#00ff88', '#a78bfa', '#fb923c'];
const GRID_ROWS = 10;
const GRID_COLS = 8;
const BUBBLE_SIZE = 40;

const createInitialGrid = () => {
  const grid = [];
  for (let row = 0; row < 5; row++) {
    const rowData = [];
    for (let col = 0; col < GRID_COLS; col++) {
      if ((row % 2 === 1 && col === GRID_COLS - 1)) {
        rowData.push(null);
      } else {
        rowData.push({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          id: `${row}-${col}-${Date.now()}`
        });
      }
    }
    grid.push(rowData);
  }
  return grid;
};

export default function BubbleBlast() {
  const [gameState, setGameState] = useState('menu');
  const [grid, setGrid] = useState([]);
  const [currentBubble, setCurrentBubble] = useState(null);
  const [nextBubble, setNextBubble] = useState(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shootAngle, setShootAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [bubblesPopped, setBubblesPopped] = useState(0);
  
  const canvasRef = useRef(null);
  const shooterRef = useRef({ x: 200, y: 550 });

  const getRandomColor = useCallback(() => {
    const gridColors = grid.flat().filter(b => b).map(b => b.color);
    const uniqueColors = [...new Set(gridColors)];
    if (uniqueColors.length === 0) return COLORS[0];
    return uniqueColors[Math.floor(Math.random() * uniqueColors.length)];
  }, [grid]);

  const initGame = useCallback(() => {
    const initialGrid = createInitialGrid();
    setGrid(initialGrid);
    setCurrentBubble({ color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    setNextBubble({ color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    setScore(0);
    setCombo(0);
    setBubblesPopped(0);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      initGame();
    }
  }, [gameState, initGame]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameState !== 'playing' || isAnimating) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const dx = mouseX - shooterRef.current.x;
      const dy = mouseY - shooterRef.current.y;
      const angle = Math.atan2(dy, dx);
      
      setShootAngle(angle);
    };

    const handleClick = () => {
      if (gameState !== 'playing' || isAnimating || !currentBubble) return;
      shootBubble();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, isAnimating, currentBubble, shootBubble]);

  const findConnectedBubbles = useCallback((grid, startRow, startCol, color) => {
    const connected = [];
    const visited = new Set();
    
    const dfs = (row, col) => {
      const key = `${row},${col}`;
      if (visited.has(key)) return;
      if (row < 0 || row >= grid.length || col < 0 || col >= GRID_COLS) return;
      
      const bubble = grid[row][col];
      if (!bubble || bubble.color !== color) return;
      
      visited.add(key);
      connected.push({ row, col });
      
      const neighbors = [
        [row - 1, col], [row + 1, col],
        [row, col - 1], [row, col + 1],
        [row - 1, col - 1], [row - 1, col + 1],
        [row + 1, col - 1], [row + 1, col + 1]
      ];
      
      neighbors.forEach(([r, c]) => dfs(r, c));
    };
    
    dfs(startRow, startCol);
    return connected;
  }, []);

  const shootBubble = useCallback(() => {
    if (!currentBubble) return;
    
    setIsAnimating(true);
    
    const speed = 10;
    const vx = Math.cos(shootAngle) * speed;
    const vy = Math.sin(shootAngle) * speed;
    
    let x = shooterRef.current.x;
    let y = shooterRef.current.y;
    
    const animate = () => {
      x += vx;
      y += vy;
      
      if (x <= BUBBLE_SIZE / 2 || x >= 400 - BUBBLE_SIZE / 2) {
        return;
      }
      
      const col = Math.floor(x / BUBBLE_SIZE);
      const row = Math.floor(y / BUBBLE_SIZE);
      
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        if (grid[row] && grid[row][col]) {
          placeBubble(row, col);
          return;
        }
      }
      
      if (y <= BUBBLE_SIZE / 2) {
        const topRow = 0;
        const topCol = Math.floor(x / BUBBLE_SIZE);
        placeBubble(topRow, topCol);
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    const placeBubble = (row, col) => {
      const newGrid = grid.map(r => [...r]);
      
      if (!newGrid[row]) {
        newGrid[row] = Array(GRID_COLS).fill(null);
      }
      
      newGrid[row][col] = {
        color: currentBubble.color,
        id: `${row}-${col}-${Date.now()}`
      };
      
      const connected = findConnectedBubbles(newGrid, row, col, currentBubble.color);
      
      if (connected.length >= 3) {
        connected.forEach(({ row: r, col: c }) => {
          newGrid[r][c] = null;
        });
        
        const points = connected.length * 10 * (combo + 1);
        setScore(s => s + points);
        setCombo(c => c + 1);
        setBubblesPopped(b => b + connected.length);
      } else {
        setCombo(0);
      }
      
      setGrid(newGrid);
      setCurrentBubble(nextBubble);
      setNextBubble({ color: getRandomColor() });
      setIsAnimating(false);
      
      const hasRemainingBubbles = newGrid.some(row => row.some(b => b));
      if (!hasRemainingBubbles) {
        setTimeout(() => {
          setGameState('gameover');
          window.dispatchEvent(new CustomEvent('dan:game-score', {
            detail: { score, gameId: 'bubble-blast', isHighScore: true }
          }));
        }, 500);
      }
    };
    
    animate();
  }, [currentBubble, nextBubble, shootAngle, grid, combo, score, findConnectedBubbles, getRandomColor]);

  const startGame = () => {
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('menu');
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
            background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(255,107,157,0.1) 100%)',
            borderRadius: 24,
            padding: 40,
            border: '1px solid rgba(0,229,255,0.2)'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🫧</div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #00e5ff 0%, #ff6b9d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 20
          }}>
            BUBBLE BLAST
          </h1>
          <p style={{ opacity: 0.7, marginBottom: 30, fontSize: '0.9rem' }}>
            Conecta 3+ burbujas del mismo color para explotarlas
          </p>
          
          <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {COLORS.map((color, i) => (
              <div key={i} style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 4px 15px ${color}50`,
                border: '2px solid rgba(255,255,255,0.2)'
              }} />
            ))}
          </div>

          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(135deg, #00e5ff 0%, #ff6b9d 100%)',
              border: 'none',
              padding: '16px 48px',
              borderRadius: 16,
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: '0 10px 30px rgba(0,229,255,0.3)'
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
            background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(255,107,157,0.1) 100%)',
            borderRadius: 24,
            padding: 40,
            border: '1px solid rgba(0,229,255,0.2)'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 30 }}>¡VICTORIA!</h2>
          
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 10 }}>SCORE FINAL</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00e5ff' }}>{score.toLocaleString()}</div>
            
            <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>BURBUJAS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b9d' }}>{bubblesPopped}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>MAX COMBO</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700' }}>{combo}x</div>
              </div>
            </div>
          </div>

          <button
            onClick={resetGame}
            style={{
              background: 'linear-gradient(135deg, #00e5ff 0%, #ff6b9d 100%)',
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
      maxWidth: 500,
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* HUD */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 20,
        padding: '0 20px',
        color: '#fff'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>SCORE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff' }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>COMBO</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: combo > 5 ? '#ffd700' : '#ff6b9d' }}>{combo}x</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>NEXT</div>
          {nextBubble && (
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: nextBubble.color,
              boxShadow: `0 4px 15px ${nextBubble.color}50`,
              border: '2px solid rgba(255,255,255,0.2)',
              marginTop: 5
            }} />
          )}
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(20,0,40,0.9) 100%)',
          borderRadius: 24,
          border: '2px solid rgba(0,229,255,0.3)',
          display: 'block',
          margin: '0 auto',
          cursor: 'crosshair'
        }}
      />

      {/* Grid Overlay */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', justifyContent: 'center' }}>
              {row.map((bubble, colIndex) => (
                bubble && (
                  <motion.div
                    key={bubble.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={{
                      width: BUBBLE_SIZE,
                      height: BUBBLE_SIZE,
                      borderRadius: '50%',
                      background: bubble.color,
                      boxShadow: `0 4px 15px ${bubble.color}50`,
                      border: '2px solid rgba(255,255,255,0.2)',
                      margin: 2
                    }}
                  />
                )
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Shooter */}
      {currentBubble && (
        <div style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: currentBubble.color,
            boxShadow: `0 4px 20px ${currentBubble.color}80`,
            border: '3px solid rgba(255,255,255,0.3)',
            position: 'relative'
          }}>
            {/* Aim line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 200,
              height: 2,
              background: 'rgba(255,255,255,0.3)',
              transformOrigin: 'left center',
              transform: `translate(-50%, -50%) rotate(${shootAngle}rad)`
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
