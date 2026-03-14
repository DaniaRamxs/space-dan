/**
 * useLiveActivity Hook
 * Manages live activity state and Colyseus room connection
 */

import { useState, useEffect, useCallback } from 'react';
import { useColyseusRoom } from './useColyseusRoom';
import { liveActivitiesService } from '../services/liveActivitiesService';
import { useAuthContext } from '../contexts/AuthContext';

export function useLiveActivity(activityId) {
  const { user } = useAuthContext();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    room, 
    state, 
    isConnected, 
    join, 
    leave, 
    sendMessage 
  } = useColyseusRoom('live_activity');

  useEffect(() => {
    if (!activityId) return;

    const loadActivity = async () => {
      setLoading(true);
      try {
        const data = await liveActivitiesService.getActivityById(activityId);
        setActivity(data);
      } catch (err) {
        console.error('[useLiveActivity] Load error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [activityId]);

  const joinActivity = useCallback(async (isSpectator = false) => {
    if (!user || !activity) return;

    try {
      await liveActivitiesService.joinActivity(activityId, isSpectator);
      
      await join({
        activityId,
        userId: user.id,
        username: user.username || 'Anonymous',
        avatar: user.avatar_url || '/default-avatar.png',
        isSpectator
      });
    } catch (err) {
      console.error('[useLiveActivity] Join error:', err);
      setError(err);
    }
  }, [user, activity, activityId, join]);

  const leaveActivity = useCallback(async () => {
    if (!user || !activityId) return;

    try {
      await liveActivitiesService.leaveActivity(activityId);
      await leave();
    } catch (err) {
      console.error('[useLiveActivity] Leave error:', err);
    }
  }, [user, activityId, leave]);

  const toggleMute = useCallback(() => {
    sendMessage('toggle_mute', {});
  }, [sendMessage]);

  const setSpeaking = useCallback((isSpeaking) => {
    sendMessage('speaking', { isSpeaking });
  }, [sendMessage]);

  const sendChat = useCallback((message) => {
    sendMessage('chat', message);
  }, [sendMessage]);

  const updateMetadata = useCallback((metadata) => {
    sendMessage('update_metadata', metadata);
  }, [sendMessage]);

  return {
    activity,
    loading,
    error,
    room,
    state,
    isConnected,
    joinActivity,
    leaveActivity,
    toggleMute,
    setSpeaking,
    sendChat,
    updateMetadata
  };
}
