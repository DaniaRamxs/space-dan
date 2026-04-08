import { useState, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { useAuthContext } from '../contexts/AuthContext';
import { createNotification } from '../services/supabaseNotifications';

const REACTION_EMOJI = {
    connection: '💖',
    impact:     '🔥',
    represent:  '🌙',
    think:      '🧠',
    underrated: '🪐',
};

export function useReactions(post, onUpdate) {
    const { user, profile } = useAuthContext();
    const [processing, setProcessing] = useState(false);

    const toggleReaction = useCallback(async (reactionType) => {
        if (!user || processing) return;

        setProcessing(true);

        // ==========================================
        // 1. OPTIMISTIC UI UPDATE
        // ==========================================
        const currentMetadata = post.reactions_metadata || { total_count: 0, top_reactions: [], user_reaction: null };
        const isRemoving = currentMetadata.user_reaction === reactionType;

        const newMetadata = { ...currentMetadata };

        if (isRemoving) {
            // Remover reacción optimista
            newMetadata.total_count = Math.max(0, parseInt(newMetadata.total_count) - 1);
            newMetadata.user_reaction = null;
            newMetadata.top_reactions = newMetadata.top_reactions.map(r =>
                r.reaction_type === reactionType ? { ...r, count: Math.max(0, parseInt(r.count) - 1) } : r
            ).filter(r => r.count > 0);
        } else {
            // Cambiar o añadir reacción optimista
            newMetadata.total_count = parseInt(newMetadata.total_count) + 1;
            newMetadata.user_reaction = reactionType;

            const existingTop = newMetadata.top_reactions.find(r => r.reaction_type === reactionType);
            if (existingTop) {
                newMetadata.top_reactions = newMetadata.top_reactions.map(r =>
                    r.reaction_type === reactionType ? { ...r, count: parseInt(r.count) + 1 } : r
                );
            } else {
                newMetadata.top_reactions = [...newMetadata.top_reactions, { reaction_type: reactionType, count: 1 }];
            }

            // Ordenar y limitar a 2 mayores
            newMetadata.top_reactions.sort((a, b) => b.count - a.count);
            newMetadata.top_reactions = newMetadata.top_reactions.slice(0, 2);
        }

        // Actualizar UI inmediatamente
        const updatedPost = { ...post, reactions_metadata: newMetadata };
        onUpdate(updatedPost);

        // ==========================================
        // 2. SERVER UPDATE
        // ==========================================
        try {
            await activityService.toggleReaction(post.id, user.id, reactionType);

            // Notificar al autor solo al AÑADIR reacción (no al quitar)
            // y nunca si es tu propio post
            if (!isRemoving && post.author_id && post.author_id !== user.id) {
                const reactorName = profile?.username || 'Alguien';
                const emoji = REACTION_EMOJI[reactionType] || '✨';
                const postRef = post.title
                    ? `"${post.title.slice(0, 40)}"`
                    : 'tu transmisión';
                // fire-and-forget para no bloquear la UI
                createNotification(
                    post.author_id,
                    'reaction',
                    `@${reactorName} reaccionó con ${emoji} a ${postRef}`,
                    post.id
                );
            }
        } catch (err) {
            console.error('[useReactions] Error toggling reaction:', err);
            // Rollback (Regresar al estado original)
            onUpdate(post);
        } finally {
            setProcessing(false);
        }
    }, [user, post, processing, onUpdate]);

    return { toggleReaction, processing };
}
