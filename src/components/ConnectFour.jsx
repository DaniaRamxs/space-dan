import { useState, useMemo } from 'react';
import useHighScore from '../hooks/useHighScore';
import { useGameCore } from '../core/useGameCore';
import { GameShell } from '../core/GameShell';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { connect4Engine } from '../engine/connect4Engine';

// --- Constants ---
const COLS = 7;
const ROWS = 6;
const PLAYER = 'P1';
const CPU = 'P2';

const playerColors = {
  P1: '#ff6eb4',
  P2: '#00e5ff',
  Draw: '#aaaaaa'
};

const EMPTY_COLOR = 'rgba(255,255,255,0.03)';

// --- Styles Competitivos ---
const styles = {
  // En mobile ocupa idealmente hasta 75vh, aspect ratio 7/6 mantenido.
  boardWrap: {
    width: '100%', maxWidth: '380px', maxHeight: '78vh',
    aspectRatio: '7/6.5', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    touchAction: 'none'
  },
  boardContainer: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20, padding: '16px 12px', width: '100%', height: '100%',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column'
  },
  colButtons: { display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 6, marginBottom: 8 },
  colBtn: {
    height: 48, background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', color: '#fff',
    fontSize: 18, lineHeight: 1, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background 0.2s, opacity 0.15s'
  },
  grid: { flex: 1, display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: 6 },
  cell: {
    width: '100%', height: '100%', borderRadius: '50%',
    transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
  },
  footerBtn: {
    flex: 1, height: 44, background: 'rgba(255,255,255,0.04)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    fontWeight: 700, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: 0.5,
    display: 'flex', justifyContent: 'center', alignItems: 'center', touchAction: 'none'
  }
};

export default function ConnectFour({ onExit }) {
  const [best, saveScore] = useHighScore('connectfour');
  const [wins, setWins] = useState(0);
  const [hoveredCol, setHoveredCol] = useState(null);

  const coreConfig = useMemo(() => ({
    gameId: 'c4-match',
    gameType: 'connect4',
    hasAI: true,
    hasTimer: true,
    aiLevel: 'hard', // Torneo IA
    mode: 'single'
  }), []);

  const core = useGameCore(connect4Engine, coreConfig);
  const { state, status, currentPlayer, winner, makeMove, resetGame } = core;

  const isFinished = status === 'FINISHED';
  const [prevFinished, setPrevFinished] = useState(false);

  // Rewards Side effects locos
  if (isFinished && !prevFinished) {
    setPrevFinished(true);
    if (winner === PLAYER) {
      const newWins = wins + 1;
      setWins(newWins);
      saveScore(newWins * 100);
    }
  }

  // Reload flag clear
  if (!isFinished && prevFinished) {
    setPrevFinished(false);
  }

  const handleColumnClick = (col) => {
    if (currentPlayer === PLAYER && status === 'PLAYING') {
      makeMove(col);
    }
  };

  const isInteractive = status === 'PLAYING' && currentPlayer === PLAYER;

  const handleExitGlobal = () => {
    // Disparar lógica de salida de React Router si se le inyecta onExit, o recargar seguro.
    if (onExit) onExit();
    else window.location.href = '/';
  };

  const CustomFooter = (
    <>
      <button style={styles.footerBtn} onClick={() => { if (window.confirm('¿Reiniciar partida actuál?')) resetGame() }}>Reiniciar</button>
      <button style={styles.footerBtn} onClick={() => alert('Próximamente: Cambio de dificultad Hard/Easy')}>Opciones</button>
    </>
  );

  return (
    <GameImmersiveLayout>
      <GameShell
        game={core}
        title="Connect 4"
        onExit={handleExitGlobal}
        playerColors={playerColors}
        bottomSlot={CustomFooter}
      >
        <div style={styles.boardWrap}>
          <div style={styles.boardContainer}>
            <div style={styles.colButtons}>
              {Array.from({ length: COLS }, (_, col) => (
                <button
                  key={col}
                  style={{ ...styles.colBtn, opacity: isInteractive && state.board[0][col] === null ? 1 : 0 }}
                  onClick={() => handleColumnClick(col)}
                  onMouseEnter={() => setHoveredCol(col)}
                  onMouseLeave={() => setHoveredCol(null)}
                  disabled={!isInteractive}
                  aria-label={`columna ${col + 1}`}
                >▼</button>
              ))}
            </div>

            <div style={styles.grid}>
              {state.board.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleColumnClick(c)}
                    onMouseEnter={() => setHoveredCol(c)}
                    onMouseLeave={() => setHoveredCol(null)}
                    style={{
                      ...styles.cell,
                      background: cell ? playerColors[cell] : EMPTY_COLOR,
                      boxShadow: cell ? `0 0 16px ${playerColors[cell]}55` : 'none',
                      cursor: isInteractive && state.board[0][c] === null ? 'pointer' : 'default',
                      outline: isInteractive && hoveredCol === c && cell === null ? `2px solid ${playerColors.P1}55` : 'none',
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </GameShell>
    </GameImmersiveLayout>
  );
}
