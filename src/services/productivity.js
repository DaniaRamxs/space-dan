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
export async function getNotes(userId) {
    const { data, error } = await supabase
        .from('cabin_notes')
        .select('content')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data?.content || '';
}

export async function saveNotes(userId, content) {
    const { error } = await supabase
        .from('cabin_notes')
        .upsert({ user_id: userId, content, updated_at: new Date().toISOString() });
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
