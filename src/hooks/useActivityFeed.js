// Simple Intelligent Cache for Activity Feed
const feedCache = new Map();

import { useState, useEffect, useCallback, useRef } from 'react';
import { activityService } from '../services/activityService';
import { useAuthContext } from '../contexts/AuthContext';

export function useActivityFeed(filter = 'all', initialLimit = 15, category = null, targetUserId = null) {
    const { user } = useAuthContext();
    const cacheKey = `${filter}-${category || 'null'}-${targetUserId || 'global'}`;

    // 1. INTENTIONAL UI: Start with cached data if available
    const [feed, setFeed] = useState(() => feedCache.get(cacheKey) || []);
    const [loading, setLoading] = useState(!feedCache.has(cacheKey));
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const offsetRef = useRef(feedCache.get(`${cacheKey}-offset`) || 0);

    const loadFeed = useCallback(async (isInitial = false) => {
        if (!user) return;

        const currentOffset = isInitial ? 0 : offsetRef.current;

        if (isInitial && !feedCache.has(cacheKey)) setLoading(true);
        else if (!isInitial) setLoadingMore(true);

        try {
            const data = await activityService.getFeed(
                targetUserId, filter, initialLimit, currentOffset, category
            );

            let newFeed = [];
            if (isInitial) {
                newFeed = data;
                offsetRef.current = data.length;
            } else {
                setFeed(prev => {
                    const combined = [...prev, ...data];
                    newFeed = Array.from(new Map(combined.map(item => [item.id, item])).values());
                    return newFeed;
                });
                offsetRef.current += data.length;
            }

            if (isInitial) {
                setFeed(newFeed);
                // 2. PERSISTENCE: Save to cache
                feedCache.set(cacheKey, newFeed);
                feedCache.set(`${cacheKey}-offset`, offsetRef.current);
            }

            setHasMore(data.length === initialLimit);
        } catch (err) {
            console.error('[useActivityFeed] Error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, filter, initialLimit, category, targetUserId, cacheKey]);

    useEffect(() => {
        // Only load if we don't have enough cached data or if explicitly requested
        // For simplicity, we refresh initial feed on mount/param change but keep old data visible
        loadFeed(true);
    }, [filter, category, user?.id, targetUserId, loadFeed]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) loadFeed(false);
    }, [loadingMore, hasMore, loading, loadFeed]);

    // 3. EXPOSE PREFETCH: Allow external components to trigger a fetch
    const prefetch = useCallback(() => {
        if (!feedCache.has(cacheKey)) {
            loadFeed(true);
        }
    }, [cacheKey, loadFeed]);

    return { feed, setFeed, loading, loadingMore, hasMore, loadMore, prefetch };
}
