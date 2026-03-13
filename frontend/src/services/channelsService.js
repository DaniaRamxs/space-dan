import { supabase } from '../supabaseClient';

export const channelsService = {
  // Get all channels for a community
  async getCommunityChannels(communityId) {
    const { data, error } = await supabase
      .from('community_channels')
      .select('*')
      .eq('community_id', communityId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get a single channel by ID
  async getChannel(channelId) {
    const { data, error } = await supabase
      .from('community_channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new channel (owner only)
  async createChannel({ communityId, name, type, description = '', parentId = null }) {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Get highest position for this type
    const { data: existing } = await supabase
      .from('community_channels')
      .select('position')
      .eq('community_id', communityId)
      .eq('type', type)
      .order('position', { ascending: false })
      .limit(1);

    const position = (existing?.[0]?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from('community_channels')
      .insert({
        community_id: communityId,
        name,
        slug,
        type,
        description,
        position,
        parent_id: parentId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a channel (owner only)
  async updateChannel(channelId, updates) {
    const { data, error } = await supabase
      .from('community_channels')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', channelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a channel (owner only)
  async deleteChannel(channelId) {
    const { error } = await supabase
      .from('community_channels')
      .delete()
      .eq('id', channelId);

    if (error) throw error;
    return true;
  },

  // Reorder channels
  async reorderChannels(communityId, channelUpdates) {
    const promises = channelUpdates.map(({ id, position }) =>
      supabase
        .from('community_channels')
        .update({ position })
        .eq('id', id)
    );

    await Promise.all(promises);
    return true;
  },

  // Check if user is owner
  async isCommunityOwner(communityId, userId) {
    const { data, error } = await supabase
      .from('communities')
      .select('owner_id')
      .eq('id', communityId)
      .single();

    if (error) throw error;
    return data?.owner_id === userId;
  },

  // Get forum posts for a channel
  async getForumPosts(channelId, { page = 1, limit = 20 } = {}) {
    const { data, error, count } = await supabase
      .from('forum_posts')
      .select('*, author:author_id(*)', { count: 'exact' })
      .eq('channel_id', channelId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    return { posts: data || [], total: count || 0 };
  },

  // Create forum post
  async createForumPost({ channelId, communityId, title, content, tags = [] }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        channel_id: channelId,
        community_id: communityId,
        author_id: user.id,
        title,
        content,
        tags,
      })
      .select('*, author:author_id(*)')
      .single();

    if (error) throw error;
    return data;
  },

  // Get forum comments
  async getForumComments(postId) {
    const { data, error } = await supabase
      .from('forum_comments')
      .select('*, author:author_id(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create forum comment
  async createForumComment({ postId, content, parentId = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
        parent_id: parentId,
      })
      .select('*, author:author_id(*)')
      .single();

    if (error) throw error;
    return data;
  },

  // Setup community defaults (for old communities without channels)
  async setupCommunity(communityId) {
    const { data, error } = await supabase
      .rpc('setup_community_defaults', { p_community_id: communityId });

    if (error) throw error;
    return data || { success: false, error: 'Unknown error' };
  },

  // ── Pasaportes de miembro ─────────────────────────────────────────────────

  async getPassport(userId, communityId) {
    const { data } = await supabase
      .from('community_member_passports')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .maybeSingle();
    return data;
  },

  async upsertPassport(userId, communityId, { signature }) {
    const { data, error } = await supabase
      .from('community_member_passports')
      .upsert({ user_id: userId, community_id: communityId, signature }, { onConflict: 'user_id,community_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Encuestas nativas ─────────────────────────────────────────────────────

  async createPoll({ channelId, communityId, creatorId, question, options, endsAt = null }) {
    const opts = options.map((text, i) => ({ id: `opt_${i}`, text }));
    const { data, error } = await supabase
      .from('community_polls')
      .insert({ channel_id: channelId, community_id: communityId, creator_id: creatorId, question, options: opts, ends_at: endsAt })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPoll(pollId) {
    const { data, error } = await supabase
      .from('community_polls')
      .select('*')
      .eq('id', pollId)
      .single();
    if (error) throw error;
    return data;
  },

  async getPollVotes(pollId) {
    const { data } = await supabase
      .from('community_poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', pollId);
    return data || [];
  },

  async votePoll(pollId, userId, optionId) {
    const { error } = await supabase
      .from('community_poll_votes')
      .upsert({ poll_id: pollId, user_id: userId, option_id: optionId }, { onConflict: 'poll_id,user_id' });
    if (error) throw error;
  },

  async closePoll(pollId) {
    const { error } = await supabase
      .from('community_polls')
      .update({ is_closed: true })
      .eq('id', pollId);
    if (error) throw error;
  },
};
