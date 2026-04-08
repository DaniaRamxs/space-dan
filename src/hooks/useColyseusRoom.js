import { useEffect, useState, useCallback, useRef } from 'react';
import { joinOrCreateRoom } from '../services/colyseusClient';

/**
 * React Hook for Colyseus Room Connection
 * 
 * Usage:
 * const { room, state, isConnected, error, join, leave, sendMessage } = useColyseusRoom('snake');
 */

export const useColyseusRoom = (roomName, options = {}) => {
  const [room, setRoom] = useState(null);
  const [state, setState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use ref to track connection attempts and avoid double connections in StrictMode
  const connectingRef = useRef(false);
  const roomRef = useRef(null);

  // Join room
  const join = useCallback(async (joinOptions = {}) => {
    // Prevent double connection attempts
    if (connectingRef.current || roomRef.current) {
      console.log('[useColyseusRoom] Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);
    connectingRef.current = true;

    try {
      const joinedRoom = await joinOrCreateRoom(roomName, {
        ...options,
        ...joinOptions
      });

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);
      setIsConnected(true);

      // Setup state change listener
      joinedRoom.onStateChange((newState) => {
        setState(newState);
      });

      // Setup error handler
      joinedRoom.onError((code, message) => {
        console.error(`[useColyseusRoom] Room error [${code}]:`, message);
        setError({ code, message });
      });

      // Setup leave handler
      joinedRoom.onLeave((code) => {
        console.log(`[useColyseusRoom] Room left [code: ${code}]`);
        setIsConnected(false);
        setRoom(null);
        setState(null);
        roomRef.current = null;
      });

      // Initial state
      setState(joinedRoom.state);

      return joinedRoom;
    } catch (err) {
      console.error('[useColyseusRoom] Join error:', err);
      setError(err);
      setIsConnected(false);
      return null;
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [roomName, options]);

  // Leave room
  const leave = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.leave();
      } catch (err) {
        console.error('[useColyseusRoom] Leave error:', err);
      }
      roomRef.current = null;
      setRoom(null);
      setState(null);
      setIsConnected(false);
    }
  }, []);

  // Send message to room
  const sendMessage = useCallback((type, message) => {
    if (roomRef.current) {
      roomRef.current.send(type, message);
    } else {
      console.warn('[useColyseusRoom] Cannot send message: not connected');
    }
  }, []);

  // Listen to specific message type
  const onMessage = useCallback((type, callback) => {
    if (roomRef.current) {
      roomRef.current.onMessage(type, callback);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    room,
    state,
    isConnected,
    isConnecting,
    error,
    join,
    leave,
    sendMessage,
    onMessage
  };
};

export default useColyseusRoom;
