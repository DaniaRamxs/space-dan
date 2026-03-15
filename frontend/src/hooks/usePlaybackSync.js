import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * usePlaybackSync
 * Robust synchronization hook for video activities (Anime, YouTube).
 * Follows Host-Authority State Snapshot model.
 */
export function usePlaybackSync({ 
    roomName, 
    activityId, 
    onStateUpdate, 
    colyseusRoom = null,
    isHls = false 
}) {
    const { profile } = useAuthContext();
    const [playbackState, setPlaybackState] = useState({
        videoId: '',
        playing: false,
        currentTime: 0,
        hostId: '',
        lastUpdate: 0
    });
    const [reactions, setReactions] = useState([]);
    const [isApplyingRemote, setIsApplyingRemote] = useState(false);
    
    // Calculate isHost directly
    const isHost = profile?.id === playbackState.hostId;

    // Using refs to avoid stale closures in event listeners
    const stateRef = useRef(playbackState);
    const syncChannelRef = useRef(null); // canal suscrito para reusar en broadcastState

    const handleRemoteState = useCallback((remoteState) => {
        if (!remoteState) return;

        setIsApplyingRemote(true);

        setPlaybackState(prev => {
            if (remoteState.lastUpdate < prev.lastUpdate && remoteState.videoId === prev.videoId) {
                return prev;
            }
            return { ...prev, ...remoteState };
        });

        if (onStateUpdate) {
            onStateUpdate(remoteState);
        }

        setTimeout(() => {
            setIsApplyingRemote(false);
        }, 50);
    }, [onStateUpdate]);

    const broadcastState = useCallback((nextState) => {
        const payload = {
            ...nextState,
            lastUpdate: Date.now(),
            hostId: profile?.id
        };

        // Broadcast through Colyseus if available (Authorized)
        if (colyseusRoom?.connection?.isOpen) {
            try { colyseusRoom.send("update_state", payload); } catch {}
        }

        // Always broadcast through Supabase for redundancy
        if (syncChannelRef.current) {
            syncChannelRef.current.send({
                type: 'broadcast',
                event: 'STATE_UPDATE',
                payload
            });
            
            // If state changed to playing, also send play_countdown for countdown functionality
            if (nextState.playing && !stateRef.current.playing) {
                syncChannelRef.current.send({
                    type: 'broadcast',
                    event: 'play_countdown',
                    payload: { hostId: profile?.id, currentTime: nextState.currentTime || 0 }
                });
            }
        }
    }, [colyseusRoom, profile?.id]);

    // Update refs and derived state
    useEffect(() => {
        stateRef.current = playbackState;
    }, [playbackState]);

    // 1. Supabase Broadcast Fallback / Secondary Sync
    useEffect(() => {
        if (!roomName) return;

        const channelName = `sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        syncChannelRef.current = channel;

        channel
            .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
                if (payload.hostId === profile?.id) return; // Don't sync from ourselves
                handleRemoteState(payload);
            })
            .on('broadcast', { event: 'SYNC_REQUEST' }, () => {
                if (stateRef.current.hostId === profile?.id) {
                    broadcastState(stateRef.current);
                    // If currently playing, also send countdown for new joiners
                    if (stateRef.current.playing) {
                        syncChannelRef.current.send({
                            type: 'broadcast',
                            event: 'play_countdown',
                            payload: { hostId: profile?.id, currentTime: stateRef.current.currentTime || 0 }
                        });
                    }
                }
            })
            .on('broadcast', { event: 'play_countdown' }, ({ payload }) => {
                if (payload?.hostId === profile?.id) return;
                // Trigger countdown for viewers - this will be handled by parent component
                if (onStateUpdate) {
                    onStateUpdate({ type: 'play_countdown', payload });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Ask for current state when joining
                    channel.send({
                        type: 'broadcast',
                        event: 'SYNC_REQUEST',
                        payload: { requesterId: profile?.id }
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName, profile?.id]);

    // 2. Colyseus Native Sync (Synchronous State)
    useEffect(() => {
        if (!colyseusRoom) return;

        const handleUpdate = (payload) => {
            handleRemoteState(payload);
        };

        // onStateChange returns an EventEmitter { handlers, clear(), remove(fn) }
        // NOT a function — calling it as unsub() crashes: "n is not a function"
        const stateEmitter = colyseusRoom.onStateChange((state) => {
            const newState = {
                videoId: state.videoId || '',
                playing: state.playing,
                currentTime: state.currentTime,
                hostId: state.hostId,
                lastUpdate: state.lastUpdate
            };

            if (newState.hostId !== profile?.id) {
                handleRemoteState(newState);
            } else {
                setPlaybackState(newState);
            }

            if (state.reactions) {
                setReactions(Array.from(state.reactions));
            }
        });

        // onMessage returns an unsubscribe function directly
        const unsubMessage = colyseusRoom.onMessage("STATE_UPDATE", handleUpdate);

        return () => {
            // Colyseus 0.16: onStateChange → EventEmitter.clear()
            if (typeof stateEmitter?.clear === 'function') {
                stateEmitter.clear();
            }
            // Colyseus 0.16: onMessage → returns unsubscribe fn
            if (typeof unsubMessage === 'function') {
                unsubMessage();
            }
        };
    }, [colyseusRoom, profile?.id]);

    const updatePlayback = useCallback((updates) => {
        // Use stateRef (not playbackState) so this callback is stable across renders.
        // If we used playbackState.hostId in deps, updatePlayback would be recreated
        // on every setPlaybackState call, causing cascading useEffect re-runs in consumers.
        const currentHostId = stateRef.current.hostId;
        if (currentHostId && currentHostId !== profile?.id) {
            console.warn('[PlaybackSync] Non-host attempted to modify state');
            return;
        }

        const nextState = {
            ...stateRef.current,
            ...updates,
            hostId: profile?.id || currentHostId
        };

        setPlaybackState(nextState);
        broadcastState(nextState);
    }, [profile?.id, broadcastState]);

    return {
        playbackState,
        isHost,
        reactions,
        isApplyingRemote,
        updatePlayback,
        setPlaybackState // Internal use only
    };
}
