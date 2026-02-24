import { supabase } from '../supabaseClient';

/** Guarda el score de una partida (solo usuarios autenticados) */
export async function saveScore(userId, gameId, score) {
    if (!userId || !gameId || score == null) return;

    // Check previous best score
    const ranks = await getUserGameRanks(userId);
    const prevRank = ranks?.find(r => r.game_id === gameId);

    const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

    await supabase.from('scores').insert({
        user_id: userId,
        game_id: gameId,
        score,
        season_id: season?.id ?? null,
    });

    // Notify if it's a new record
    if (!prevRank || score > prevRank.max_score) {
        const { createNotification } = await import('./supabaseNotifications');
        const formattedScore = score.toLocaleString();
        await createNotification(userId, 'record', `¡Felicidades! Rompiste tu récord personal en ${gameId.toUpperCase()} con ${formattedScore} pts.`);
    }
}

/** Top N scores por juego (mejor score por usuario) */
export async function getLeaderboard(gameId, limit = 10) {
    const { data, error } = await supabase.rpc('get_leaderboard', {
        p_game_id: gameId,
        p_limit: limit,
    });
    if (error) { console.error('leaderboard:', error); return []; }
    return data || [];
}

/**
 * Sincroniza un logro desbloqueado al DB, premia coins y envía notificación.
 * coins: cantidad de Dancoins a otorgar (0 si el logro no tiene recompensa)
 */
export async function syncAchievementToDb(achievementId, achievementTitle = '', coins = 0) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.from('user_achievements').upsert(
        { user_id: session.user.id, achievement_id: achievementId },
        { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    );

    if (!error) {
        // Award coins via SECURITY DEFINER (server validates, prevents client manipulation)
        if (coins > 0) {
            await supabase.rpc('award_coins', {
                p_user_id: session.user.id,
                p_amount: coins,
                p_type: 'achievement',
                p_reference: achievementId,
                p_description: achievementTitle,
            });
        }

        if (achievementTitle) {
            const { createNotification } = await import('./supabaseNotifications');
            await createNotification(session.user.id, 'achievement', `¡Desbloqueaste el logro "${achievementTitle}"!`);
        }
    }
}

/**
 * Asegura que exista un perfil para el usuario.
 * Importante para usuarios que existían antes del trigger.
 */
export async function ensureProfile(user) {
    if (!user) return;

    const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (!data) {
        await supabase.from('profiles').insert({
            id: user.id,
            username: null, // Will trigger onboarding
            avatar_url: user.user_metadata?.avatar_url || null,
        });
    }
}


export const getUserGameRanks = async (userId) => {
    const { data, error } = await supabase.rpc('get_user_game_ranks', { p_user_id: userId });
    if (error) {
        console.error('Error fetching user game ranks:', error);
        return [];
    }
    return data;
};

export const getGlobalLeaderboard = async (limit = 50) => {
    const { data, error } = await supabase.rpc('get_global_leaderboard', { p_limit: limit });
    if (error) {
        console.error('Error fetching global leaderboard:', error);
        return [];
    }
    return data;
};

export const getUserRankInGame = async (userId, gameId) => {
    const ranks = await getUserGameRanks(userId);
    return ranks.find(r => r.game_id === gameId);
};
