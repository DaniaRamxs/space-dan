import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, Search, Filter, Pin, Lock, Clock,
  MessageCircle, ChevronLeft, MoreHorizontal, Heart, Share2,
  Send, X, Tag
} from 'lucide-react';
import { channelsService } from '../../services/channelsService';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function ForumChannel({ channel, communityId, isMember, isOwner }) {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, popular, pinned

  const loadPosts = useCallback(async () => {
    if (!channel?.id) return;
    try {
      setLoading(true);
      const { posts } = await channelsService.getForumPosts(channel.id);
      setPosts(posts);
    } catch (err) {
      console.error('[ForumChannel] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreatePost = async ({ title, content, tags }) => {
    try {
      const newPost = await channelsService.createForumPost({
        channelId: channel.id,
        communityId,
        title,
        content,
        tags,
      });
      setPosts(prev => [newPost, ...prev]);
      setShowCreateModal(false);
      toast.success('Post creado');
    } catch (err) {
      console.error('[ForumChannel] Create post error:', err);
      toast.error('Error al crear post');
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'popular') return (b.comments_count || 0) - (a.comments_count || 0);
    if (sortBy === 'pinned') return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
    return 0;
  });

  if (selectedPost) {
    return (
      <PostDetail 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)}
        isMember={isMember}
        user={user}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-amber-400" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-gray-500">{posts.length} posts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMember && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-cyan-950 font-medium text-sm transition-colors"
            >
              <Plus size={18} />
              Nuevo post
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar posts..."
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
          >
            <option value="newest">Más recientes</option>
            <option value="popular">Más populares</option>
            <option value="pinned">Fijados</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#1a1a24] rounded-xl p-4 animate-pulse">
                <div className="h-4 w-48 bg-white/5 rounded mb-2" />
                <div className="h-3 w-full bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-amber-400/50" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No hay posts aún
            </h3>
            <p className="text-gray-500 text-sm max-w-md mb-6">
              Sé el primero en crear una discusión en este foro
            </p>
            {isMember && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-cyan-950 font-semibold transition-colors"
              >
                Crear post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
}

function PostCard({ post, onClick }) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { 
    addSuffix: true, 
    locale: es 
  });

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="w-full text-left bg-[#1a1a24] hover:bg-[#1f1f2e] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all group"
    >
      <div className="flex items-start gap-4">
        <img
          src={post.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`}
          alt={post.author?.username}
          className="w-10 h-10 rounded-full bg-white/5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{post.title}</h4>
            {post.is_pinned && (
              <Pin size={14} className="text-amber-400" />
            )}
            {post.is_locked && (
              <Lock size={14} className="text-gray-500" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="text-cyan-400">@{post.author?.username}</span>
            <span>•</span>
            <Clock size={14} />
            <span>{timeAgo}</span>
          </div>
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{post.content}</p>
          
          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MessageCircle size={14} />
              {post.comments_count || 0} comentarios
            </span>
            <span className="flex items-center gap-1">
              <Heart size={14} />
              {Object.values(post.reactions || {}).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function PostDetail({ post, onBack, isMember, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await channelsService.getForumComments(post.id);
      setComments(data);
    } catch (err) {
      console.error('[PostDetail] Load comments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isMember) return;

    try {
      const comment = await channelsService.createForumComment({
        postId: post.id,
        content: newComment.trim(),
        parentId: replyingTo?.id,
      });
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      toast.error('Error al enviar comentario');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13]">
      {/* Header */}
      <div className="h-14 flex items-center gap-4 px-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h3 className="font-semibold text-white">{post.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Original Post */}
        <div className="bg-[#1a1a24] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <img
              src={post.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`}
              alt={post.author?.username}
              className="w-12 h-12 rounded-full bg-white/5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-white">{post.author?.username}</span>
                <span className="text-gray-500 text-sm">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">{post.title}</h1>
              <div className="text-gray-300 whitespace-pre-wrap">{post.content}</div>
              
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <MessageCircle size={18} />
            {comments.length} comentarios
          </h4>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay comentarios aún. Sé el primero en comentar.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 bg-[#1a1a24]/50 rounded-lg p-4">
                <img
                  src={comment.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author?.username}`}
                  alt={comment.author?.username}
                  className="w-8 h-8 rounded-full bg-white/5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{comment.author?.username}</span>
                    <span className="text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                  <button
                    onClick={() => setReplyingTo(comment)}
                    className="text-xs text-cyan-400 hover:underline mt-2"
                  >
                    Responder
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Input */}
      {isMember && (
        <div className="p-4 border-t border-white/5">
          {replyingTo && (
            <div className="mb-2 px-3 py-2 bg-white/5 rounded flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Respondiendo a <span className="text-cyan-400">{replyingTo.author?.username}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-lg text-cyan-950 font-medium transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function CreatePostModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), tags });
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-1">Nuevo post</h3>
        <p className="text-sm text-gray-500 mb-6">Crea una nueva discusión en el foro</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué quieres discutir?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contenido</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe tu post en detalle..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Etiquetas</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                placeholder="Agregar etiqueta (Enter)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
              >
                <Tag size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-xl text-cyan-950 font-medium transition-all"
            >
              Crear post
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
