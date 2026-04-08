import { useEffect, useState } from 'react';
import { useColyseusRoom } from '../hooks/useColyseusRoom';

/**
 * Production Connection Test Component
 * 
 * Tests connection to Railway-deployed backend:
 * - Frontend: https://spacely-frontend-production.up.railway.app
 * - Backend: wss://spacely-server-production.up.railway.app
 */

const BACKEND_URL = 'wss://spacely-server-production.up.railway.app';
const FRONTEND_URL = 'https://spacely-frontend-production.up.railway.app';

// Generate userId outside component (stable across renders)
const generateUserId = () => 'test_' + Date.now();

export const ProductionConnectionTest = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthError, setHealthError] = useState(null);
  
  // Stable userId using lazy state initializer
  const [userId] = useState(generateUserId);

  const {
    room,
    state,
    isConnected,
    isConnecting,
    error,
    join,
    leave
  } = useColyseusRoom('snake', {
    username: 'TestPlayer',
    userId
  });

  // Test HTTP health endpoint
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('https://spacely-server-production.up.railway.app/health');
        const data = await response.json();
        setHealthStatus(data);
      } catch (err) {
        setHealthError(err.message);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-connect WebSocket
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      join();
    }
  }, [join, isConnected, isConnecting]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Production Connection Test</h1>
      
      {/* URLs */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <p><strong>Frontend:</strong> {FRONTEND_URL}</p>
        <p><strong>Backend WebSocket:</strong> {BACKEND_URL}</p>
      </div>

      {/* HTTP Health Check */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-2">HTTP Health Check</h2>
        {healthError ? (
          <div className="text-red-600">
            ❌ Error: {healthError}
          </div>
        ) : healthStatus ? (
          <div className="text-green-600">
            ✅ Server OK
            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded">
              {JSON.stringify(healthStatus, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="text-gray-500">Checking...</div>
        )}
      </div>

      {/* WebSocket Connection */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-2">WebSocket Connection</h2>
        {isConnecting && (
          <div className="text-blue-600">⏳ Connecting...</div>
        )}
        {error && (
          <div className="text-red-600">
            ❌ Connection Error: {error.message}
          </div>
        )}
        {isConnected && (
          <div className="text-green-600">
            ✅ Connected to room "snake"
            <p className="text-sm mt-1">
              Session ID: {room?.sessionId}
            </p>
          </div>
        )}
      </div>

      {/* Game State */}
      {isConnected && state && (
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Game State (Sync)</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={join}
          disabled={isConnected || isConnecting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Connect
        </button>
        <button
          onClick={leave}
          disabled={!isConnected}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

export default ProductionConnectionTest;
