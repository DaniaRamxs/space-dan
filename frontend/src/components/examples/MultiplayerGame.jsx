import React, { useEffect, useState, useCallback } from 'react';
import { useColyseusRoom } from '../hooks/useColyseusRoom';

/**
 * Example React Component for Colyseus Multiplayer Connection
 * 
 * This component demonstrates:
 * - Connecting to a room on mount
 * - Displaying synchronized state
 * - Sending messages to the server
 * - Handling connection errors
 * - Manual reconnect
 */

const GAME_ROOM = 'snake'; // Change to your room name: 'snake', 'chess', 'asteroid-battle', etc.

export const MultiplayerGame = ({ 
  roomName = GAME_ROOM, 
  playerName = 'Player',
  onGameEnd 
}) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  
  const {
    room,
    state,
    isConnected,
    isConnecting,
    error,
    join,
    leave,
    sendMessage,
    onMessage
  } = useColyseusRoom(roomName, {
    username: playerName
  });

  // Auto-join on mount
  useEffect(() => {
    join();
  }, [join]);

  // Listen to custom messages
  useEffect(() => {
    if (!room) return;

    // Example: listen for chat messages
    onMessage('chat', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    // Example: listen for game-specific messages
    onMessage('game_started', () => {
      console.log('Game started!');
    });

    onMessage('game_ended', (data) => {
      console.log('Game ended:', data);
      if (onGameEnd) onGameEnd(data);
    });
  }, [room, onMessage, onGameEnd]);

  // Send chat message
  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;
    
    sendMessage('chat', {
      text: message,
      sender: playerName,
      timestamp: Date.now()
    });
    
    setMessage('');
  }, [message, playerName, sendMessage]);

  // Send game action
  const handleGameAction = useCallback((action) => {
    sendMessage('player_action', action);
  }, [sendMessage]);

  // Render connection status
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to {roomName}...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-700 font-semibold mb-2">Connection Error</h3>
        <p className="text-red-600 text-sm mb-4">
          {error.message || 'Failed to connect to game server'}
        </p>
        <button
          onClick={() => join()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Render disconnected state
  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600 mb-4">Not connected to game server</p>
        <button
          onClick={() => join()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Connect to {roomName}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 font-medium">
            Connected to {roomName}
          </span>
          <span className="text-gray-400 text-sm">
            (Session: {room?.sessionId?.slice(0, 8)}...)
          </span>
        </div>
        <button
          onClick={leave}
          className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
        >
          Disconnect
        </button>
      </div>

      {/* Game State Display (Example) */}
      {state && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">Game State</h4>
          <pre className="text-xs text-gray-600 overflow-auto max-h-40">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}

      {/* Game Actions */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Game Actions</h4>
        <div className="flex gap-2">
          <button
            onClick={() => handleGameAction({ type: 'move', direction: 'up' })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ↑ Up
          </button>
          <button
            onClick={() => handleGameAction({ type: 'move', direction: 'down' })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ↓ Down
          </button>
          <button
            onClick={() => handleGameAction({ type: 'move', direction: 'left' })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ← Left
          </button>
          <button
            onClick={() => handleGameAction({ type: 'move', direction: 'right' })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            → Right
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Chat</h4>
        <div className="h-32 overflow-y-auto border border-gray-200 rounded p-2 mb-2 bg-gray-50">
          {chatMessages.length === 0 ? (
            <p className="text-gray-400 text-sm">No messages yet...</p>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} className="text-sm mb-1">
                <span className="font-medium">{msg.sender}:</span>
                <span className="text-gray-700 ml-1">{msg.text}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGame;
