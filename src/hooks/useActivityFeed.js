import { useState, useEffect, useCallback, useRef } from 'react';
import { activityService } from '../services/activityService';
import { useAuthContext } from '../contexts/AuthContext';

// Bounded cache: max 5 keys (LRU), max 50 items per feed
const MAX_CACHE_ENTRIES = 5;
const MAX_FEED_ITEMS = 50;
const feedCache = new Map();

function setCacheEntry(key, value) {
    if (feedCache.has(key)) {
        feedCache.delete(key); // refresh insertion order (LRU)
    } else if (feedCache.size >= MAX_CACHE_ENTRIES * 2) {
        // Evict the oldest entry
        const oldest = feedCache.keys().next().value;
        feedCache.delete(oldest);
    }
    feedCache.set(key, value);
}

export function useActivityFeed(filter = 'all', initialLimit = 15, category = null, targetUserId = null) {
    const { user } = useAuthContext();
    const cacheKey = `${filter}-${category || 'null'}-${targetUserId || 'global'}`;

    // Start with cached data if available for instant display
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
                newFeed = data.slice(0, MAX_FEED_ITEMS);
                offsetRef.current = newFeed.length;
                setFeed(newFeed);
                setCacheEntry(cacheKey, newFeed);
                setCacheEntry(`${cacheKey}-offset`, offsetRef.current);
            } else {
                setFeed(prev => {
                    const combined = [...prev, ...data];
                    const deduped = Array.from(new Map(combined.map(item => [item.id, item])).values());
                    newFeed = deduped.slice(0, MAX_FEED_ITEMS);
                    return newFeed;
                });
                offsetRef.current += data.length;
            }

            // Stop loading more if we hit the item cap or got fewer results than requested
            setHasMore(data.length === initialLimit && (offsetRef.current < MAX_FEED_ITEMS));
        } catch (err) {
            console.error('[useActivityFeed] Error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, filter, initialLimit, category, targetUserId, cacheKey]);

    useEffect(() => {
        loadFeed(true);
    }, [filter, category, user?.id, targetUserId, loadFeed]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) loadFeed(false);
    }, [loadingMore, hasMore, loading, loadFeed]);

    const prefetch = useCallback(() => {
        if (!feedCache.has(cacheKey)) {
            loadFeed(true);
        }
    }, [cacheKey, loadFeed]);

    return { feed, setFeed, loading, loadingMore, hasMore, loadMore, prefetch };
}
