import React, { useEffect, useCallback, useRef } from 'react';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';
import MeteoriteEntrance from '../Effects/MeteoriteEntrance';
import { PostSkeleton } from '../Skeletons/Skeleton';
import LivenessSignals from './LivenessSignals';
export default function ActivityFeed({ userId, filter = 'all', category = null }) {
    const { feed, setFeed, loading, loadingMore, hasMore, loadMore } = useActivityFeed(filter, 20, category, userId);
    const sentinelRef = useRef(null);
    const isGlobalFeed = !userId;

    // ... resto del componente (handleUpdatePost, handleNewPost, etc.)
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

    const mixedFeed = feed;

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-2xl px-0 md:px-4">
                <LivenessSignals />
            </div>

            <div className="w-full max-w-2xl mt-4">
                {mixedFeed.length > 0 ? (
                    <div className="flex flex-col divide-y divide-white/[0.03]">
                        {mixedFeed.map((item) =>
                            item.kind === 'universe_event' ? (
                                <div key={`univ-${item.id}`} className="feed-item">
                                    <MeteoriteEntrance>
                                        <CosmicEventCard event={item} />
                                    </MeteoriteEntrance>
                                </div>
                            ) : (
                                <div key={item.id} className="feed-item">
                                    <MeteoriteEntrance>
                                        <ActivityCard
                                            post={item}
                                            onUpdate={handleUpdatePost}
                                            onNewPost={handleNewPost}
                                        />
                                    </MeteoriteEntrance>
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <span className="text-4xl mb-4 block">🛰️</span>
                        <p className="text-[10px] uppercase tracking-[0.4em]">Silencio estelar</p>
                    </div>
                )}

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
