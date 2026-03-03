import React, { useEffect, useCallback, useRef } from 'react';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';
import { PostSkeleton } from '../Skeletons/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import LivenessSignals from './LivenessSignals';
import { List } from 'react-window';

export default function ActivityFeed({ userId, filter = 'all', category = null }) {
    const { feed, setFeed, loading, loadingMore, hasMore, loadMore } = useActivityFeed(filter, 20, category, userId);
    const listRef = useRef();
    const sizeMap = useRef({});

    const setSize = useCallback((index, size) => {
        sizeMap.current = { ...sizeMap.current, [index]: size };
        // resetAfterIndex is not available in v2.x ref
    }, []);

    const getItemSize = index => sizeMap.current[index] || 160;

    const handleUpdatePost = useCallback((updatedPost) => {
        setFeed(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }, [setFeed]);

    const isGlobalFeed = !userId;

    const handleNewPost = useCallback((newPost, optimisticId = null) => {
        if (!newPost) return;
        if (isGlobalFeed && newPost.type === 'repost') return;
        setFeed(prev => {
            // Si viene con un ID optimista, reemplazamos el temporal por el real
            if (optimisticId) {
                return prev.map(p => p.id === optimisticId ? newPost : p);
            }
            // Evitar duplicados por ID real
            if (prev.find(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
        });
    }, [setFeed, isGlobalFeed]);

    useEffect(() => {
        const onNewPost = (e) => {
            const newPost = e.detail;
            if (!newPost) return;
            handleNewPost(newPost);
        };
        window.addEventListener('activity:new-post', onNewPost);
        return () => window.removeEventListener('activity:new-post', onNewPost);
    }, [handleNewPost]);

    // Row Renderer for Virtualization
    const Row = ({ index, style }) => {
        const rowRef = useRef();
        const post = feed[index];

        useEffect(() => {
            if (rowRef.current) {
                setSize(index, rowRef.current.getBoundingClientRect().height);
            }
        }, [index]); // Removed setSize from deps to avoid unnecessary loops

        if (!post) return null;

        // Intersection observer inside Row to trigger loadMore if near end
        useEffect(() => {
            if (index === feed.length - 3 && hasMore && !loadingMore && !loading) {
                loadMore();
            }
        }, [index, hasMore, loadingMore, loading]);

        return (
            <div style={style}>
                <div ref={rowRef}>
                    <ActivityCard
                        post={post}
                        onUpdate={handleUpdatePost}
                        onNewPost={handleNewPost}
                        onHeightChange={() => {
                            if (rowRef.current) {
                                setSize(index, rowRef.current.getBoundingClientRect().height);
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    if (loading && feed.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4">
                {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-2xl px-0 md:px-4">
                <LivenessSignals />
            </div>

            <div className="w-full max-w-2xl h-[calc(100vh-200px)] mt-4">
                {feed.length > 0 ? (
                    <List
                        ref={listRef}
                        height={window.innerHeight - 200}
                        rowCount={feed.length}
                        rowHeight={getItemSize}
                        rowComponent={Row}
                        rowProps={{}}
                        width="100%"
                        className="no-scrollbar"
                    />
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <span className="text-4xl mb-4 block">🛰️</span>
                        <p className="text-[10px] uppercase tracking-[0.4em]">Silencio estelar</p>
                    </div>
                )}

                {loadingMore && (
                    <div className="py-8 flex justify-center">
                        <div className="w-5 h-5 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
