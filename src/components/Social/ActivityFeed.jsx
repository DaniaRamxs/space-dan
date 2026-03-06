import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';
import CosmicEventCard from './CosmicEventCard';
import { PostSkeleton } from '../Skeletons/Skeleton';
import LivenessSignals from './LivenessSignals';
import { cosmicEventService } from '../../services/cosmicEventService';

// ── Mezcla posts y eventos por fecha descendente ──────────────────────────────
function mergeFeedWithEvents(posts, events) {
    const all = [
        ...posts.map(p => ({ ...p, kind: p.kind || 'post', _ts: new Date(p.created_at).getTime() })),
        ...events.map(e => ({ ...e, kind: 'cosmic_event', _ts: new Date(e.created_at).getTime() })),
    ];
    // Ordenar por timestamp descendente
    all.sort((a, b) => b._ts - a._ts);

    // Anti-spam: max 1 evento cada 3 posts normales
    const result = [];
    let eventCountSinceLastPost = 0;
    for (const item of all) {
        if (item.kind === 'cosmic_event') {
            // Insertar evento si ya hay al menos 2 posts antes del anterior evento
            if (eventCountSinceLastPost >= 2 || result.filter(r => r.kind === 'post').length === 0) {
                result.push(item);
                eventCountSinceLastPost = 0;
            }
            // Si no, lo saltamos (evita apilar eventos)
        } else {
            result.push(item);
            eventCountSinceLastPost++;
        }
    }
    return result;
}

export default function ActivityFeed({ userId, filter = 'all', category = null }) {
    const { feed, setFeed, loading, loadingMore, hasMore, loadMore } = useActivityFeed(filter, 20, category, userId);
    const [events, setEvents] = useState([]);
    const sentinelRef = useRef(null);
    const isGlobalFeed = !userId;

    // Cargar eventos cósmicos recientes (solo en el feed global)
    useEffect(() => {
        if (!isGlobalFeed) return;
        cosmicEventService.getRecentEvents(20)
            .then(setEvents)
            .catch(() => setEvents([]));
    }, [isGlobalFeed]);

    const handleUpdatePost = useCallback((updatedPost) => {
        setFeed(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }, [setFeed]);

    const handleNewPost = useCallback((newPost, optimisticId = null) => {
        if (!newPost) return;
        if (isGlobalFeed && newPost.type === 'repost') return;
        setFeed(prev => {
            if (optimisticId) return prev.map(p => p.id === optimisticId ? newPost : p);
            if (prev.find(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
        });
    }, [setFeed, isGlobalFeed]);

    useEffect(() => {
        const onNewPost = (e) => handleNewPost(e.detail);
        window.addEventListener('activity:new-post', onNewPost);
        return () => window.removeEventListener('activity:new-post', onNewPost);
    }, [handleNewPost]);

    // Nuevo evento cósmico en tiempo real
    useEffect(() => {
        if (!isGlobalFeed) return;
        const onNewEvent = (e) => {
            if (e.detail?.kind === 'cosmic_event') {
                setEvents(prev => [e.detail, ...prev]);
            }
        };
        window.addEventListener('cosmic:new-event', onNewEvent);
        return () => window.removeEventListener('cosmic:new-event', onNewEvent);
    }, [isGlobalFeed]);

    // IntersectionObserver para infinite scroll
    useEffect(() => {
        if (!sentinelRef.current || !hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMore(); },
            { rootMargin: '300px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadMore]);

    if (loading && feed.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4">
                {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
            </div>
        );
    }

    // Mezclar posts + eventos solo en el feed global
    const mixedFeed = isGlobalFeed ? mergeFeedWithEvents(feed, events) : feed;

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-2xl px-0 md:px-4">
                <LivenessSignals />
            </div>

            <div className="w-full max-w-2xl mt-4">
                {mixedFeed.length > 0 ? (
                    <div className="flex flex-col divide-y divide-white/[0.03]">
                        {mixedFeed.map((item) =>
                            item.kind === 'cosmic_event' ? (
                                <CosmicEventCard key={`evt-${item.id}`} event={item} />
                            ) : (
                                <ActivityCard
                                    key={item.id}
                                    post={item}
                                    onUpdate={handleUpdatePost}
                                    onNewPost={handleNewPost}
                                />
                            )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <span className="text-4xl mb-4 block">🛰️</span>
                        <p className="text-[10px] uppercase tracking-[0.4em]">Silencio estelar</p>
                    </div>
                )}

                {/* Sentinel para infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {loadingMore && (
                    <div className="py-8 flex justify-center">
                        <div className="w-5 h-5 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
