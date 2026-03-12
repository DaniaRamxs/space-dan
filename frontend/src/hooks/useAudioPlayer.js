/**
 * useAudioPlayer Hook
 * Multi-source audio player with fallback chain
 * Supports: Server-extracted URLs, YouTube IFrame, HTML5 Audio
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { useYouTube } from '../contexts/YouTubeContext';
import toast from 'react-hot-toast';

export function useAudioPlayer() {
  const { isReady: youtubeReady, YT } = useYouTube();
  const [audioState, setAudioState] = useState({
    status: 'idle', // idle, loading, ready, playing, paused, error
    source: null,   // server, youtube, html5, none
    canPlay: false,
    error: null
  });

  const youtubePlayerRef = useRef(null);
  const html5AudioRef = useRef(null);
  const currentVideoIdRef = useRef(null);

  /**
   * Try to load audio using multiple sources with fallback
   */
  const loadAudio = useCallback(async (videoId) => {
    if (!videoId) {
      console.warn('[AudioPlayer] No video ID provided');
      return;
    }

    currentVideoIdRef.current = videoId;
    setAudioState(prev => ({ ...prev, status: 'loading', error: null }));

    console.log('[AudioPlayer] 🎵 Loading audio for:', videoId);

    // Strategy 1: Try server-side extraction first (most reliable)
    try {
      console.log('[AudioPlayer] Trying server-side extraction...');
      const audioData = await audioService.getAudioStream(videoId);
      
      if (audioData && audioData.url) {
        console.log('[AudioPlayer] ✅ Server extraction successful');
        
        // Use HTML5 audio for direct URLs
        if (!html5AudioRef.current) {
          html5AudioRef.current = new Audio();
        }
        
        html5AudioRef.current.src = audioData.url;
        html5AudioRef.current.load();
        
        // Wait for audio to be ready
        await new Promise((resolve, reject) => {
          html5AudioRef.current.oncanplay = resolve;
          html5AudioRef.current.onerror = reject;
          setTimeout(reject, 5000); // 5s timeout
        });

        setAudioState({
          status: 'ready',
          source: 'server',
          canPlay: true,
          error: null,
          duration: audioData.duration,
          title: audioData.title
        });

        console.log('[AudioPlayer] ✅ HTML5 audio ready');
        return { success: true, source: 'server', duration: audioData.duration };
      }
    } catch (error) {
      console.warn('[AudioPlayer] Server extraction failed:', error.message);
    }

    // Strategy 2: Fallback to YouTube IFrame Player
    if (youtubeReady && YT && YT.Player) {
      try {
        console.log('[AudioPlayer] Trying YouTube IFrame player...');
        
        if (!youtubePlayerRef.current) {
          // Create hidden YouTube player
          const playerDiv = document.createElement('div');
          playerDiv.id = 'youtube-audio-player';
          playerDiv.style.position = 'absolute';
          playerDiv.style.top = '-9999px';
          playerDiv.style.left = '-9999px';
          document.body.appendChild(playerDiv);

          youtubePlayerRef.current = new YT.Player('youtube-audio-player', {
            height: '0',
            width: '0',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                console.log('[AudioPlayer] YouTube player ready');
              },
              onError: (event) => {
                console.error('[AudioPlayer] YouTube player error:', event.data);
              }
            }
          });
        }

        // Load video
        youtubePlayerRef.current.loadVideoById(videoId);
        
        // Wait a bit for video to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const duration = youtubePlayerRef.current.getDuration();
        
        if (duration && duration > 0) {
          setAudioState({
            status: 'ready',
            source: 'youtube',
            canPlay: true,
            error: null,
            duration: duration * 1000
          });

          console.log('[AudioPlayer] ✅ YouTube player ready');
          return { success: true, source: 'youtube', duration: duration * 1000 };
        }
      } catch (error) {
        console.warn('[AudioPlayer] YouTube player failed:', error.message);
      }
    }

    // Strategy 3: No audio available
    console.warn('[AudioPlayer] ⚠️ No audio source available');
    setAudioState({
      status: 'ready',
      source: 'none',
      canPlay: true,
      error: 'No audio available'
    });

    toast('Jugando sin música', { icon: '🔇' });
    return { success: false, source: 'none' };

  }, [youtubeReady, YT]);

  /**
   * Play audio
   */
  const play = useCallback(() => {
    try {
      if (audioState.source === 'server' && html5AudioRef.current) {
        html5AudioRef.current.play();
        setAudioState(prev => ({ ...prev, status: 'playing' }));
      } else if (audioState.source === 'youtube' && youtubePlayerRef.current) {
        youtubePlayerRef.current.playVideo();
        setAudioState(prev => ({ ...prev, status: 'playing' }));
      }
    } catch (error) {
      console.error('[AudioPlayer] Play error:', error);
    }
  }, [audioState.source]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    try {
      if (audioState.source === 'server' && html5AudioRef.current) {
        html5AudioRef.current.pause();
        setAudioState(prev => ({ ...prev, status: 'paused' }));
      } else if (audioState.source === 'youtube' && youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
        setAudioState(prev => ({ ...prev, status: 'paused' }));
      }
    } catch (error) {
      console.error('[AudioPlayer] Pause error:', error);
    }
  }, [audioState.source]);

  /**
   * Stop and cleanup
   */
  const stop = useCallback(() => {
    try {
      if (html5AudioRef.current) {
        html5AudioRef.current.pause();
        html5AudioRef.current.currentTime = 0;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.stopVideo();
      }
      setAudioState(prev => ({ ...prev, status: 'idle' }));
    } catch (error) {
      console.error('[AudioPlayer] Stop error:', error);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (html5AudioRef.current) {
        html5AudioRef.current.pause();
        html5AudioRef.current = null;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, []);

  return {
    audioState,
    loadAudio,
    play,
    pause,
    stop,
    youtubePlayer: youtubePlayerRef.current,
    html5Audio: html5AudioRef.current
  };
}
