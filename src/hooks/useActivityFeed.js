import { useState, useEffect, useCallback, useRef } from 'react';
import { activityService } from '../services/activityService';
import { useAuthContext } from '../contexts/AuthContext';

export function useActivityFeed(filter = 'all', initialLimit = 15, category = null, targetUserId = null) {
    const { user } = useAuthContext();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const offsetRef = useRef(0);

    const loadFeed = useCallback(async (isInitial = false) => {
        if (!user) return;

        const currentOffset = isInitial ? 0 : offsetRef.current;

        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            const data = await activityService.getFeed(
                targetUserId || user?.id, filter, initialLimit, currentOffset, category
            );

            if (isInitial) {
                setFeed(data);
                offsetRef.current = data.length;
            } else {
                setFeed(prev => {
                    const combined = [...prev, ...data];
                    return Array.from(new Map(combined.map(item => [item.id, item])).values());
                });
                offsetRef.current += data.length;
            }

            setHasMore(data.length === initialLimit);
        } catch (err) {
            console.error('[useActivityFeed] Error:', err);
        } finally {
            if (isInitial) setLoading(false);
            else setLoadingMore(false);
        }
    }, [user, filter, initialLimit, category]);

    // Resetea y recarga cuando cambia filter, user o category
    useEffect(() => {
        offsetRef.current = 0;
        setFeed([]);
        setHasMore(true);
        loadFeed(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, category, user?.id, targetUserId, loadFeed]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) loadFeed(false);
    }, [loadingMore, hasMore, loading, loadFeed]);

    return { feed, setFeed, loading, loadingMore, hasMore, loadMore };
}
