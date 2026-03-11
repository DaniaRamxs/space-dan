// src/components/GitHubStats.jsx
import { useState, useEffect } from 'react';
import { Github, Star, GitFork, Users, BookOpen, ExternalLink, AlertCircle } from 'lucide-react';

const LANG_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  Go: '#00add8',
  Rust: '#dea584',
  Vue: '#41b883',
  default: '#8b949e',
};

function LangDot({ lang }) {
  return (
    <span
      className="ghLangDot"
      style={{ background: LANG_COLORS[lang] || LANG_COLORS.default }}
      title={lang}
    />
  );
}

function StatPill({ icon: Icon, value, label }) {
  return (
    <div className="ghStatPill">
      <Icon size={14} />
      <span className="ghStatValue">{value}</span>
      <span className="ghStatLabel">{label}</span>
    </div>
  );
}

export default function GitHubStats({ username }) {
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`https://api.github.com/users/${username}`, { signal: controller.signal }),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, { signal: controller.signal }),
    ])
      .then(async ([uRes, rRes]) => {
        if (!uRes.ok) throw new Error(`GitHub API: ${uRes.status}`);
        const [userData, reposData] = await Promise.all([uRes.json(), rRes.json()]);
        setUser(userData);
        setRepos(Array.isArray(reposData) ? reposData : []);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [username]);

  if (loading) {
    return (
      <div className="ghWrapper">
        <div className="ghLoading">
          <span className="blinkText" style={{ color: 'var(--accent)', fontSize: 13 }}>
            cargando datos de GitHub...
          </span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="ghWrapper">
        <div className="ghError">
          <AlertCircle size={16} style={{ color: 'var(--accent)' }} />
          <span>No se pudo cargar GitHub — {error}</span>
        </div>
      </div>
    );
  }

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);

  return (
    <div className="ghWrapper">
      {/* Profile header */}
      <div className="ghProfile">
        <img src={user.avatar_url} alt={user.login} className="ghAvatar" />
        <div className="ghProfileInfo">
          <div className="ghName">{user.name || user.login}</div>
          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ghUsername"
          >
            <Github size={12} />
            @{user.login}
          </a>
          {user.bio && <p className="ghBio">{user.bio}</p>}
        </div>
      </div>

      {/* Stats row */}
      <div className="ghStats">
        <StatPill icon={BookOpen} value={user.public_repos} label="repos" />
        <StatPill icon={Users} value={user.followers} label="seguidores" />
        <StatPill icon={Star} value={totalStars} label="estrellas" />
        <StatPill icon={GitFork} value={repos.reduce((a, r) => a + (r.forks_count || 0), 0)} label="forks" />
      </div>

      {/* Repos */}
      {repos.length > 0 && (
        <div className="ghRepos">
          <div className="sectionLabel" style={{ marginBottom: 10 }}>repositorios recientes</div>
          <div className="ghReposGrid">
            {repos.map(repo => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ghRepoCard"
              >
                <div className="ghRepoHeader">
                  <span className="ghRepoName">{repo.name}</span>
                  <ExternalLink size={11} style={{ opacity: 0.5 }} />
                </div>
                {repo.description && (
                  <p className="ghRepoDesc">{repo.description}</p>
                )}
                <div className="ghRepoMeta">
                  {repo.language && (
                    <span className="ghRepoLang">
                      <LangDot lang={repo.language} />
                      {repo.language}
                    </span>
                  )}
                  {repo.stargazers_count > 0 && (
                    <span className="ghRepoStat">
                      <Star size={11} />
                      {repo.stargazers_count}
                    </span>
                  )}
                  {repo.forks_count > 0 && (
                    <span className="ghRepoStat">
                      <GitFork size={11} />
                      {repo.forks_count}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
