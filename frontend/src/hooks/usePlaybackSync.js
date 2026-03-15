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
    const [isHost, setIsHost] = useState(false);
    const [reactions, setReactions] = useState([]);

    // Using refs to avoid stale closures in event listeners
    const stateRef = useRef(playbackState);
    const isApplyingRemoteRef = useRef(false);
    const syncChannelRef = useRef(null); // canal suscrito para reusar en broadcastState

    useEffect(() => {
        stateRef.current = playbackState;
        setIsHost(profile?.id === playbackState.hostId);
    }, [playbackState, profile?.id]);

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

    const handleRemoteState = (remoteState) => {
        if (!remoteState) return;
        
        // Prevent feedback loops
        isApplyingRemoteRef.current = true;
        
        setPlaybackState(prev => {
            // Only update if the incoming state is newer or vital
            if (remoteState.lastUpdate < prev.lastUpdate && remoteState.videoId === prev.videoId) {
                isApplyingRemoteRef.current = false;
                return prev;
            }
            return { ...prev, ...remoteState };
        });

        if (onStateUpdate) {
            onStateUpdate(remoteState);
        }

        // Reset the flag after a tick to allow the player to react
        setTimeout(() => {
            isApplyingRemoteRef.current = false;
        }, 50);
    };

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

    const updatePlayback = useCallback((updates) => {
        // Only host can update state
        if (playbackState.hostId && playbackState.hostId !== profile?.id) {
            console.warn('[PlaybackSync] Non-host attempted to modify state');
            return;
        }

        const nextState = {
            ...stateRef.current,
            ...updates,
            hostId: profile?.id || stateRef.current.hostId
        };

        setPlaybackState(nextState);
        broadcastState(nextState);
    }, [playbackState.hostId, profile?.id, broadcastState]);

    return {
        playbackState,
        isHost,
        reactions,
        isApplyingRemote: isApplyingRemoteRef.current,
        updatePlayback,
        setPlaybackState // Internal use only
    };
}
