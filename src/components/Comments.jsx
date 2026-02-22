import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

export default function Comments({ postId }) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    const sub = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, fetchComments)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || sending) return;
    setSending(true);
    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text.trim(),
    });
    setText('');
    setSending(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('comments').delete().eq('id', id);
  };

  return (
    <div className="commentsSection">
      <h3 className="commentsTitle">◈ comentarios</h3>

      {loading ? (
        <div className="blinkText" style={{ fontSize: 12, textAlign: 'center' }}>cargando comentarios...</div>
      ) : (
        <div className="commentsList">
          {comments.length === 0 && (
            <p className="tinyText" style={{ textAlign: 'center' }}>
              sin comentarios aún — ¡sé el primero!
            </p>
          )}
          {comments.map(c => (
            <div key={c.id} className="commentEntry">
              <div className="commentHeader">
                <span className="commentAuthor">
                  {c.profiles?.avatar_url && (
                    <img src={c.profiles.avatar_url} alt="" className="commentAvatar" />
                  )}
                  {c.profiles?.username || 'usuario'}
                </span>
                <span className="commentDate">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                {user?.id === c.user_id && (
                  <button className="commentDelete" onClick={() => handleDelete(c.id)} title="eliminar">
                    ✕
                  </button>
                )}
              </div>
              <p className="commentText">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form className="commentForm" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="escribe un comentario..."
            maxLength={500}
            rows={3}
          />
          <div className="commentFormFooter">
            <span className="tinyText">{text.length}/500</span>
            <button type="submit" className="retroBtn" disabled={sending || !text.trim()}>
              {sending ? 'enviando...' : 'comentar'}
            </button>
          </div>
        </form>
      ) : (
        <p className="tinyText commentLoginMsg">
          inicia sesión para dejar un comentario ✨
        </p>
      )}
    </div>
  );
}
