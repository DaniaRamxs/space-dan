import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { lastfmService } from '../services/lastfmService';

export function useLastfm({ userId = null, isOwn = true } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [recentTracks, setRecentTracks] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const resolveUserId = async () => {
    if (userId) return userId;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  };

  const checkConnection = async () => {
    try {
      const targetId = await resolveUserId();
      if (!targetId) return;

      const name = await lastfmService.getUsername(targetId);
      if (name) {
        setUsername(name);
        setIsConnected(true);
        await fetchData(name);
      }
    } catch (err) {
      console.error('[Last.fm] Error checking connection:', err);
    }
  };

  const fetchData = async (name) => {
    const lfmUser = name || username;
    if (!lfmUser) return;

    try {
      const [info, playing, recent, tracks, artists] = await Promise.all([
        lastfmService.getUserInfo(lfmUser).catch(() => null),
        lastfmService.getCurrentPlaying(lfmUser).catch(() => null),
        lastfmService.getRecentTracks(lfmUser, 10).catch(() => []),
        lastfmService.getTopTracks(lfmUser, 10).catch(() => []),
        lastfmService.getTopArtists(lfmUser, 6).catch(() => []),
      ]);

      setUserInfo(info);
      setCurrentlyPlaying(playing);
      setRecentTracks(recent);
      setTopTracks(tracks);
      setTopArtists(artists);
    } catch (err) {
      console.error('[Last.fm] Error fetching data:', err);
    }
  };

  const connect = async (inputUsername) => {
    if (!isOwn) return;
    setIsLoading(true);
    try {
      await lastfmService.connect(inputUsername.trim());
      setUsername(inputUsername.trim());
      setIsConnected(true);
      await fetchData(inputUsername.trim());
    } catch (err) {
      console.error('[Last.fm] Error connecting:', err);
      throw err; // let the component show the error
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    if (!isOwn) return;
    try {
      await lastfmService.disconnect();
      setIsConnected(false);
      setUsername(null);
      setUserInfo(null);
      setCurrentlyPlaying(null);
      setRecentTracks([]);
      setTopTracks([]);
      setTopArtists([]);
    } catch (err) {
      console.error('[Last.fm] Error disconnecting:', err);
    }
  };

  const refreshData = useCallback(async () => {
    if (!isConnected || !username) return;
    setIsLoading(true);
    try {
      await fetchData(username);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, username]);

  // Auto-refresh "now playing" every 30 seconds
  useEffect(() => {
    if (!isConnected || !username) return;

    const interval = setInterval(() => {
      lastfmService.getCurrentPlaying(username)
        .then(setCurrentlyPlaying)
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, username]);

  return {
    isConnected,
    isLoading,
    username,
    userInfo,
    currentlyPlaying,
    recentTracks,
    topTracks,
    topArtists,
    connect,
    disconnect,
    refreshData,
  };
}
