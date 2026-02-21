// src/pages/PostsPage.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { posts } from '../data/postsData';
import LikeButton from '../components/LikeButton';

const PAGE_SIZE = 5;

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function monthKey(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${MONTHS_ES[+month - 1]} ${year}`;
}

// All unique tags across all posts
const ALL_TAGS = [...new Set(posts.flatMap((p) => p.tags || []))].sort();

export default function PostsPage() {
  const [search, setSearch]           = useState('');
  const [activeTag, setActiveTag]     = useState(null);
  const [activePeriod, setActivePeriod] = useState(null);
  const [visible, setVisible]         = useState(PAGE_SIZE);

  // Build archive: unique month-year sorted newest → oldest
  const archive = useMemo(() => {
    const seen = new Set();
    const order = [];
    for (const p of [...posts].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = monthKey(p.date);
      if (!seen.has(k)) { seen.add(k); order.push(k); }
    }
    return order.map((k) => [k, posts.filter((p) => monthKey(p.date) === k).length]);
  }, []);

  // Filtered list (newest first)
  const filtered = useMemo(() => {
    let list = [...posts].sort((a, b) => b.date.localeCompare(a.date));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
      );
    }
    if (activeTag) {
      list = list.filter((p) => p.tags?.includes(activeTag));
    }
    if (activePeriod) {
      list = list.filter((p) => monthKey(p.date) === activePeriod);
    }
    return list;
  }, [search, activeTag, activePeriod]);

  const shown = filtered.slice(0, visible);

  function resetFilters(newState) {
    setVisible(PAGE_SIZE);
    if ('search' in newState) setSearch(newState.search);
    if ('tag' in newState)    setActiveTag(newState.tag);
    if ('period' in newState) setActivePeriod(newState.period);
  }

  return (
    <main className="card">
      <div className="pageHeader">
        <h1 style={{ margin: 0, fontSize: 18 }}>Posts</h1>
        <p className="tinyText">{posts.length} posts largos :3</p>
      </div>

      {/* ── Search ─────────────────────────────────── */}
      <input
        className="searchInput"
        type="text"
        placeholder="buscar posts..."
        value={search}
        onChange={(e) => resetFilters({ search: e.target.value })}
      />

      {/* ── Tag filters ────────────────────────────── */}
      {ALL_TAGS.length > 0 && (
        <div className="tagRow">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              className={`tagPill${activeTag === tag ? ' active' : ''}`}
              onClick={() => resetFilters({ tag: activeTag === tag ? null : tag })}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Date Archive ───────────────────────────── */}
      <div className="archiveWidget">
        <span className="archiveLabel">archivo :</span>
        {archive.map(([period, count]) => (
          <button
            key={period}
            className={`archivePill${activePeriod === period ? ' active' : ''}`}
            onClick={() => resetFilters({ period: activePeriod === period ? null : period })}
          >
            {period} ({count})
          </button>
        ))}
      </div>

      {/* ── Post list ──────────────────────────────── */}
      <div className="postsList" style={{ marginTop: 8, display: 'grid', gap: 12 }}>
        {shown.length === 0 ? (
          <p className="tinyText">no hay posts que coincidan :c</p>
        ) : (
          shown.map((p) => (
            <div key={p.id} className="postCardWrap">
              <Link to={`/posts/${p.id}`} className="postCard postLink">
                <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="postCardDate">{p.date}</span>
                  <span className="postCardMood">{p.mood}</span>
                  {p.tags?.map((tag) => (
                    <span key={tag} className="postCardTag">#{tag}</span>
                  ))}
                </div>
                <h3 className="postCardTitle" style={{ margin: 0 }}>{p.title}</h3>
                <p className="postCardPreview">{p.content}</p>
              </Link>
              <div style={{ paddingLeft: 4 }}>
                <LikeButton postId={p.id} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Load more ──────────────────────────────── */}
      {visible < filtered.length && (
        <button
          className="loadMoreBtn"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          cargar más antiguos ↓
        </button>
      )}

      <div style={{ marginTop: 14 }}>
        <Link to="/home" className="backLink">← volver al Profile</Link>
      </div>
    </main>
  );
}
