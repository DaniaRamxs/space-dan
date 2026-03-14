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

    useEffect(() => {
        stateRef.current = playbackState;
        setIsHost(profile?.id === playbackState.hostId);
    }, [playbackState, profile?.id]);

    // 1. Supabase Broadcast Fallback / Secondary Sync
    useEffect(() => {
        if (!roomName) return;

        const channelName = `sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);

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

        const unbind = colyseusRoom.state.onChange(() => {
            const newState = {
                videoId: colyseusRoom.state.videoId || '',
                playing: colyseusRoom.state.playing,
                currentTime: colyseusRoom.state.currentTime,
                hostId: colyseusRoom.state.hostId,
                lastUpdate: colyseusRoom.state.lastUpdate
            };
            
            if (newState.hostId !== profile?.id) {
                handleRemoteState(newState);
            } else {
                setPlaybackState(newState);
            }

            if (colyseusRoom.state.reactions) {
                setReactions(Array.from(colyseusRoom.state.reactions));
            }
        });

        // Listen for direct snapshots (late joins)
        colyseusRoom.onMessage("STATE_UPDATE", (payload) => {
            handleRemoteState(payload);
        });

        return () => unbind();
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
        if (colyseusRoom) {
            colyseusRoom.send("update_state", payload);
        }

        // Always broadcast through Supabase for redundancy
        const channelName = `sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        supabase.channel(channelName).send({
            type: 'broadcast',
            event: 'STATE_UPDATE',
            payload
        });
    }, [colyseusRoom, roomName, profile?.id]);

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
