import { supabase } from '../supabaseClient';

export const newProfileService = {
    // --- BLOG ---
    async getBlogPosts(userId, includeDrafts = false) {
        console.log('Obteniendo blogs para:', userId);
        let query = supabase
            .from('blog_posts')
            .select('*')
            .eq('user_id', userId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (!includeDrafts) {
            query = query.eq('is_published', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getBlogPostBySlug(username, slug) {
        // 1. Get the author first with all needed info
        const { data: prof, error: profError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .ilike('username', username.replace('@', ''))
            .maybeSingle();

        if (profError || !prof) throw new Error('Author not found');

        // 2. Get the post for this specific author (WITHOUT JOIN to avoid missing FK errors)
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('user_id', prof.id)
            .single();

        if (error) throw error;

        // 3. Manually attach the author data to match the expected structure
        return { ...data, author: prof };
    },

    async createBlogPost(postData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('blog_posts')
            .insert({ ...postData, user_id: user.id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- THEME ---
    async getProfileTheme(userId) {
        const { data, error } = await supabase
            .from('profile_themes')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data || this.getDefaultTheme(userId);
    },

    getDefaultTheme(userId) {
        return {
            user_id: userId,
            primary_color: '#06b6d4',
            secondary_color: '#8b5cf6',
            font_style: 'sans',
            layout_style: 'default',
            background_style: 'mesh'
        };
    },

    async updateProfileTheme(themeData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('profile_themes')
            .upsert({ ...themeData, user_id: user.id, updated_at: new Date().toISOString() })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- BLOCKS ---
    async getProfileBlocks(userId) {
        const { data, error } = await supabase
            .from('profile_blocks')
            .select('*')
            .eq('user_id', userId)
            .order('order_index', { ascending: true });

        if (error) throw error;

        // Default blocks if none found
        if (!data || data.length === 0) {
            return [
                { block_type: 'stats', order_index: 0, is_active: true },
                { block_type: 'thought', order_index: 1, is_active: true },
                { block_type: 'spotify', order_index: 2, is_active: true }
            ];
        }
        return data;
    },

    async updateProfileBlocks(blocks) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const cleanBlocks = blocks.map(b => ({
            user_id: user.id,
            block_type: b.block_type,
            is_active: b.is_active,
            config: b.config,
            order_index: b.order_index
        }));

        const { data, error } = await supabase
            .from('profile_blocks')
            .upsert(cleanBlocks, { onConflict: 'user_id,block_type' })
            .select();

        if (error) throw error;
        return data;
    }
};
