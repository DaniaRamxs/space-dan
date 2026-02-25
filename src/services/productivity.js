import { supabase } from '../supabaseClient';

/**
 * cabin_tasks
 */
export async function getTasks(userId) {
    const { data, error } = await supabase
        .from('cabin_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function addTask(userId, title, isToday = true) {
    const { data, error } = await supabase
        .from('cabin_tasks')
        .insert([{ user_id: userId, title, is_today: isToday }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function toggleTask(taskId, isCompleted) {
    const { data, error } = await supabase
        .from('cabin_tasks')
        .update({
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', taskId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteTask(taskId) {
    const { error } = await supabase
        .from('cabin_tasks')
        .delete()
        .eq('id', taskId);
    if (error) throw error;
}

/**
 * cabin_notes
 */
/**
 * cabin_notes (Ideario)
 */
export async function getNotes(userId) {
    const { data, error } = await supabase
        .from('cabin_notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function addNote(userId, content = '', color = 'purple') {
    const { data, error } = await supabase
        .from('cabin_notes')
        .insert([{ user_id: userId, content, color }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateNote(noteId, content) {
    const { data, error } = await supabase
        .from('cabin_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteNote(noteId) {
    const { error } = await supabase
        .from('cabin_notes')
        .delete()
        .eq('id', noteId);
    if (error) throw error;
}

/**
 * cabin_stats & sessions
 */
export async function getProductivityStats(userId) {
    const { data, error } = await supabase
        .from('cabin_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function finishFocusSession(userId, minutes = 25) {
    const { data, error } = await supabase.rpc('complete_focus_session', {
        p_user_id: userId,
        p_minutes: minutes
    });
    if (error) throw error;
    return data;
}

export async function getRecentFocusSessions(userId, days = 7) {
    const { data, error } = await supabase
        .from('cabin_sessions')
        .select('duration_minutes, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}
