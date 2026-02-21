// src/components/PostsSection.jsx
import { Link } from "react-router-dom";
import { posts } from "../data/postsData";

export default function PostsSection({ limit = 2 }) {
  const preview = posts.slice(0, limit);

  return (
    <section className="postsSection">
      <div className="postsSectionHeader">
        <h2 className="cardTitle">Posts</h2>
        <Link to="/posts" className="tinyText">
          ver todos →
        </Link>
      </div>

      <div className="postsList">
        {preview.map((p) => (
          <Link
            key={p.id}
            to={`/posts/${p.id}`}
            className="postCard postLink"
          >
            <div className="postHeader">
              <div className="postTitleRow">
                <h3 className="postTitle">{p.title}</h3>
                <span className="postDate">{p.date}</span>
              </div>
              <div className="postMeta">
                <span className="postMood">Mood: {p.mood}</span>
              </div>
            </div>

            {/* preview corto */}
            <p className="postContent">
              {p.content.length > 120 ? p.content.slice(0, 120) + "…" : p.content}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
