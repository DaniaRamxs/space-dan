import { supabase } from '../supabaseClient';

/** Guarda el score de una partida (solo usuarios autenticados) */
export async function saveScore(userId, gameId, score) {
    if (!userId || !gameId || score == null) return;

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
 * Sincroniza un logro desbloqueado al DB.
 * Obtiene la sesión internamente — safe to call fire-and-forget.
 */
export async function syncAchievementToDb(achievementId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from('user_achievements').upsert(
        { user_id: session.user.id, achievement_id: achievementId },
        { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    );
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
            username:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                'usuario',
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
