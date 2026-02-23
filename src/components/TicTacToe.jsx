import React, { useState, useEffect } from 'react';
import useHighScore from '../hooks/useHighScore';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [, reportScore] = useHighScore('ttt');

  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6] // Diagonales
  ];

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinner(null);
    setWinningLine([]);
  };

  const checkWinner = (currentBoard) => {
    for (let pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: pattern };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winner: 'draw', line: [] };
    }
    return null;
  };

  const makeAIMove = (currentBoard) => {
    // IA inteligente con minimax
    const emptyCells = currentBoard.map((cell, idx) => cell === null ? idx : null).filter(val => val !== null);
    
    // Intentar ganar
    for (let cell of emptyCells) {
      const testBoard = [...currentBoard];
      testBoard[cell] = 'O';
      if (checkWinner(testBoard)?.winner === 'O') {
        return cell;
      }
    }

    // Bloquear al jugador
    for (let cell of emptyCells) {
      const testBoard = [...currentBoard];
      testBoard[cell] = 'X';
      if (checkWinner(testBoard)?.winner === 'X') {
        return cell;
      }
    }

    // Tomar el centro si está disponible
    if (currentBoard[4] === null) return 4;

    // Tomar una esquina
    const corners = [0, 2, 6, 8].filter(i => currentBoard[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

    // Cualquier celda disponible
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  };

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const aiMove = makeAIMove(board);
        const newBoard = [...board];
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        
        const result = checkWinner(newBoard);
        if (result) {
          setWinner(result.winner);
          setWinningLine(result.line);
        } else {
          setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, winner, board]);

  // Fire score when player wins
  useEffect(() => {
    if (winner === 'X') reportScore(10);
  }, [winner]);

  // Auto-reiniciar después de ganar/perder
  useEffect(() => {
    if (winner) {
      const timer = setTimeout(() => {
        resetGame();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [winner]);

  const handleClick = (index) => {
    if (board[index] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
    } else {
      setIsPlayerTurn(false);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto p-2">
      <div className="w-full">
        {/* Título */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-blue-400 mb-1">Tic Tac Toe</h1>
          <p className="text-xs text-gray-400">Tú (X) vs IA (O)</p>
        </div>

        {/* Tablero */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-blue-900/50 shadow-2xl mb-3">
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={!isPlayerTurn || winner}
                className={`
                  aspect-square rounded-lg text-2xl font-bold transition-all duration-200
                  ${winningLine.includes(index) 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 scale-105' 
                    : 'bg-gradient-to-br from-blue-900 to-blue-800'
                  }
                  ${cell === 'X' ? 'text-cyan-300' : cell === 'O' ? 'text-blue-300' : 'text-transparent'}
                  ${!cell && isPlayerTurn && !winner ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95' : 'cursor-not-allowed'}
                  border-2 border-blue-700/50 shadow-md
                `}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        {/* Estado del juego */}
        <div className="text-center">
          {!winner && (
            <p className="text-sm text-gray-300">
              {isPlayerTurn ? '🎮 Tu turno' : '🤖 IA pensando...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;