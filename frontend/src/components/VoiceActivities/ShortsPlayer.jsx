/**
 * ShortsPlayer.jsx
 * TikTok-style vertical swipe feed for YouTube Shorts.
 * Renders 9:16 vertical videos with swipe/scroll navigation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
    ChevronUp, ChevronDown, Heart, MessageCircle,
    Share2, Play, Pause, Volume2, VolumeX, X, Search,
    Zap, Crown, Users, Laugh, Ghost
} from 'lucide-react';
import ReactionOverlay from '@/components/reactions/ReactionOverlay';

const QUICK_REACTIONS = [
    { type: 'emoji', content: '😂', icon: Laugh, color: 'text-yellow-400' },
    { type: 'emoji', content: '🔥', icon: Zap, color: 'text-orange-500' },
    { type: 'emoji', content: '😱', icon: Ghost, color: 'text-purple-400' },
    { type: 'emoji', content: '❤️', icon: Heart, color: 'text-red-500' },
];

export default function ShortsPlayer({
    shortsFeed = [],
    currentIndex = 0,
    onIndexChange,
    onClose,
    onSearchMore,
    isHost = false,
    hostParticipant = null,
    playbackState = {},
    updatePlayback,
    room = null,
    gifOverlays = [],
    isStorming = false,
    sendReaction,
    participantCount = 1,
}) {
    const [internalIndex, setInternalIndex] = useState(currentIndex);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const overlayTimeoutRef = useRef(null);
    const isPlayingRef = useRef(true);

    const activeIndex = onIndexChange ? currentIndex : internalIndex;
    const setActiveIndex = onIndexChange || setInternalIndex;

    const currentShort = shortsFeed[activeIndex] || null;

    // Keep ref in sync
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // ── YouTube Player Setup ────────────────────────────────────────────────
    useEffect(() => {
        if (!currentShort?.id) return;

        const handleYTReady = () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch {}
            }

            const wrapper = document.getElementById('shorts-player-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '<div id="shorts-player"></div>';
            }

            playerRef.current = new window.YT.Player('shorts-player', {
                height: '100%',
                width: '100%',
                videoId: currentShort.id,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    loop: 1,
                    playlist: currentShort.id,
                    modestbranding: 1,
                    origin: window.location.origin,
                    enablejsapi: 1,
                    playsinline: 1,
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(isMuted ? 0 : 100);
                        if (isPlayingRef.current) e.target.playVideo();
                    },
                    onStateChange: (e) => {
                        if (e.data === 0) {
                            // Video ended — auto-advance for host
                            if (isHost && activeIndex < shortsFeed.length - 1) {
                                navigateTo(activeIndex + 1);
                            }
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) handleYTReady();
        else window.onYouTubeIframeAPIReady = handleYTReady;

        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch {}
                playerRef.current = null;
            }
        };
    }, [currentShort?.id]);

    // ── Mute sync ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!playerRef.current) return;
        try {
            if (isMuted) playerRef.current.mute();
            else playerRef.current.unMute();
        } catch {}
    }, [isMuted]);

    // ── Navigation ──────────────────────────────────────────────────────────
    const navigateTo = useCallback((idx) => {
        if (idx < 0 || idx >= shortsFeed.length) return;
        setActiveIndex(idx);

        if (isHost && updatePlayback) {
            updatePlayback({
                videoId: shortsFeed[idx]?.id,
                playing: true,
                currentTime: 0,
            });
        }
    }, [shortsFeed, isHost, updatePlayback, setActiveIndex]);

    const goNext = useCallback(() => {
        if (activeIndex < shortsFeed.length - 1) {
            navigateTo(activeIndex + 1);
        } else if (onSearchMore) {
            onSearchMore();
        }
    }, [activeIndex, shortsFeed.length, navigateTo, onSearchMore]);

    const goPrev = useCallback(() => {
        if (activeIndex > 0) navigateTo(activeIndex - 1);
    }, [activeIndex, navigateTo]);

    // ── Scroll/swipe handler ────────────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isHost) return;

        let touchStartY = 0;
        let lastScroll = 0;

        const handleWheel = (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastScroll < 600) return;
            lastScroll = now;

            if (e.deltaY > 0) goNext();
            else if (e.deltaY < 0) goPrev();
        };

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {
            const diff = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(diff) < 60) return;

            if (diff > 0) goNext();
            else goPrev();
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [goNext, goPrev, isHost]);

    // ── Keyboard navigation ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isHost) return;

        const handleKey = (e) => {
            if (e.key === 'ArrowDown' || e.key === 'j') goNext();
            else if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
            else if (e.key === ' ') {
                e.preventDefault();
                togglePlay();
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [goNext, goPrev, isHost]);

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
        } else {
            playerRef.current.playVideo();
            setIsPlaying(true);
        }
    };

    const handleOverlayTap = () => {
        setShowOverlay(true);
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 3000);
    };

    // ── Render ──────────────────────────────────────────────────────────────
    if (!shortsFeed.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Zap size={48} className="text-purple-400 opacity-30 mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Sin Shorts</h3>
                <p className="text-white/40 text-xs mb-6">Busca contenido corto para empezar.</p>
                {isHost && onSearchMore && (
                    <button
                        onClick={onSearchMore}
                        className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all"
                    >
                        Buscar Shorts
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden"
            onClick={handleOverlayTap}
        >
            {/* 9:16 Vertical container */}
            <div className="relative h-full aspect-[9/16] max-w-full bg-black overflow-hidden">
                {/* YouTube Player */}
                <div id="shorts-player-wrapper" className="absolute inset-0">
                    <div id="shorts-player" className="w-full h-full" />
                </div>

                {/* Reaction Overlay */}
                <ReactionOverlay gifOverlays={gifOverlays} isStorming={isStorming} />

                {/* Slide transition indicator */}
                <AnimatePresence>
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 pointer-events-none"
                    />
                </AnimatePresence>

                {/* Top gradient overlay */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

                {/* Bottom gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest">
                            Shorts
                        </span>
                        <span className="text-white/30 text-[10px] font-mono">
                            {activeIndex + 1}/{shortsFeed.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHost ? (
                            <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/20 rounded text-[8px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1">
                                <Crown size={8} fill="currentColor" /> HOST
                            </span>
                        ) : (
                            <span className="text-white/30 text-[10px]">
                                <Users size={10} className="inline mr-1" />
                                Host: {hostParticipant?.username || '...'}
                            </span>
                        )}
                        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <div className="mb-4">
                        <h4 className="text-sm font-bold text-white line-clamp-2 mb-1 drop-shadow-lg">
                            {currentShort?.name || currentShort?.title || 'Short'}
                        </h4>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">
                            {currentShort?.artist || currentShort?.channel || 'YouTube'}
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-1 justify-center mb-3">
                        {shortsFeed.slice(
                            Math.max(0, activeIndex - 3),
                            Math.min(shortsFeed.length, activeIndex + 4)
                        ).map((_, i) => {
                            const realIdx = Math.max(0, activeIndex - 3) + i;
                            return (
                                <div
                                    key={realIdx}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        realIdx === activeIndex
                                            ? 'w-6 bg-white'
                                            : 'w-1.5 bg-white/30'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Right-side action buttons */}
                <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-4">
                    {/* Quick reactions */}
                    {QUICK_REACTIONS.map((r, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                sendReaction?.({ type: r.type, content: r.content });
                            }}
                            className="p-2 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/10"
                        >
                            <r.icon size={20} className={r.color} />
                        </button>
                    ))}

                    {/* Mute toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="p-2 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all border border-white/10"
                    >
                        {isMuted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
                    </button>

                    {/* Viewers count */}
                    <div className="flex flex-col items-center">
                        <Users size={18} className="text-white/50" />
                        <span className="text-[9px] text-white/40 font-bold mt-1">{participantCount}</span>
                    </div>
                </div>

                {/* Navigation arrows (host only) */}
                {isHost && (
                    <>
                        {activeIndex > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                className="absolute top-1/2 -translate-y-full left-1/2 -translate-x-1/2 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all"
                            >
                                <ChevronUp size={24} className="text-white" />
                            </button>
                        )}
                        {activeIndex < shortsFeed.length - 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); goNext(); }}
                                className="absolute bottom-1/2 translate-y-full left-1/2 -translate-x-1/2 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all"
                            >
                                <ChevronDown size={24} className="text-white" />
                            </button>
                        )}
                    </>
                )}

                {/* Play/Pause center overlay */}
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none"
                        >
                            <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play size={32} className="text-white ml-1" fill="white" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tap to play/pause (center area) */}
                <div
                    className="absolute inset-0 z-[11] cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isHost) togglePlay();
                    }}
                />
            </div>
        </div>
    );
}
