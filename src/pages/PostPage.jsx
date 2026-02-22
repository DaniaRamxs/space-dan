// src/pages/PostPage.jsx
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPostById } from '../data/postsData';
import LikeButton from '../components/LikeButton';
import usePostViews from '../hooks/usePostViews';
import Comments from '../components/Comments';

export default function PostPage() {
  const { id } = useParams();
  const post = getPostById(id);
  const views = usePostViews(post?.id);

  if (!post) {
    return (
      <main className="card">
        <h1 style={{ margin: 0, fontSize: 18 }}>No existe ese post</h1>
        <p className="tinyText">capaz el id no existe o está mal.</p>
        <Link to="/posts" className="backLink">← volver a Posts</Link>
      </main>
    );
  }

  return (
    <main className="card">
      <Link to="/posts" className="backLink">← volver a Posts</Link>

      <div className="pageHeader">
        <h1 style={{ margin: '10px 0 0' }}>{post.title}</h1>

        <div className="postMetaRow">
          <span className="postCardDate">{post.date}</span>
          <span className="postCardMood">{post.mood}</span>
          {views !== null && (
            <span className="postViews">👁 {views}</span>
          )}
        </div>

        {post.tags?.length > 0 && (
          <div className="tagRow" style={{ marginTop: 8 }}>
            {post.tags.map((tag) => (
              <span key={tag} className="postCardTag">#{tag}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <LikeButton postId={post.id} />
        </div>
      </div>

      <div className="postBigText markdownContent">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>

      {post.playlist && (
        <div className="playlistBlock" style={{ marginTop: 14 }}>
          <img
            src={post.playlist.gif}
            alt="gif"
            style={{ width: 120, height: 'auto', display: 'block', marginBottom: 10 }}
          />
          <div className="blinkText" style={{ marginBottom: 10 }}>
            {post.playlist.label}
          </div>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: 12 }}
            src={post.playlist.embed}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify playlist"
          />
        </div>
      )}

      <Comments postId={post.id} />
    </main>
  );
}
