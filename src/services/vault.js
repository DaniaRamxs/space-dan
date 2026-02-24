import { supabase } from '../supabaseClient';

export const vaultService = {
    /**
     * Fetch all personal notes in the vault.
     */
    async getNotes() {
        const { data, error } = await supabase
            .from('vault_notes')
            .select('*')
            .order('pinned', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Add a new note to the vault.
     */
    async addNote(title, content, label = 'personal') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('vault_notes')
            .insert({ title, content, label, user_id: user.id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing note.
     */
    async updateNote(id, updates) {
        const { data, error } = await supabase
            .from('vault_notes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a note.
     */
    async deleteNote(id) {
        const { error } = await supabase
            .from('vault_notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Fetch all saved items (letters and notes) in the vault.
     */
    async getSavedItems() {
        const { data, error } = await supabase
            .from('vault_items')
            .select('*, letter:letters(*), note:vault_notes(*)')
            .order('saved_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Save a letter to the vault.
     */
    async saveLetterToVault(letterId) {
        const { data, error } = await supabase
            .from('vault_items')
            .insert({ item_type: 'letter', letter_id: letterId })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
