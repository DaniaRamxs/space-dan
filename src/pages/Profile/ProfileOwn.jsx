import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { supabase } from '../../supabaseClient';
import { ACHIEVEMENTS } from '../../hooks/useAchievements';
import { getUserGameRanks } from '../../services/supabaseScores';
import { getTransactionHistory, getActiveFund, getFundTopDonors, donateToFund, transferCoins } from '../../services/economy';
import { getProductivityStats } from '../../services/productivity';
import { setBannerColor as saveBannerColor } from '../../services/store';
import { blogService } from '../../services/blogService';
import PetDisplay from '../../components/PetDisplay';
import { Link } from 'react-router-dom';
import AvatarUploader from '../../components/AvatarUploader';
import { profileSocialService } from '../../services/profile_social';

const GAME_NAMES = {
  asteroids: 'Asteroids', tetris: 'Tetris', snake: 'Snake', pong: 'Pong',
  memory: 'Memory', ttt: 'Tic Tac Toe', whack: 'Whack-a-Mole', color: 'Color Match',
  reaction: 'Reaction Time', '2048': '2048', blackjack: 'Blackjack',
  puzzle: 'Sliding Puzzle', invaders: 'Space Invaders', breakout: 'Breakout',
  flappy: 'Flappy Bird', mines: 'Buscaminas', dino: 'Dino Runner',
  connect4: 'Connect Four', simon: 'Simon Says', cookie: 'Cookie Clicker',
  maze: 'Maze', catch: 'Catch Game', dodge: 'Dodge Game',
};

// ── Frame styles por item ID ──────────────────────────────────
function getFrameStyle(frameItemId) {
  if (!frameItemId) return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
  const id = frameItemId.toLowerCase();
  // IDs concretos de la DB
  if (id === 'frame_stars') return { border: '3px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.8)' };
  if (id === 'frame_neon') return { border: '3px solid #00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.8)' };
  if (id === 'frame_pixel') return { border: '4px solid #ff6b35', boxShadow: '0 0 15px rgba(255,107,53,0.7)', imageRendering: 'pixelated' };
  if (id === 'frame_holo') return { border: '3px solid #b464ff', boxShadow: '0 0 20px rgba(180,100,255,0.8), 0 0 40px rgba(0,229,255,0.4)' };
  if (id === 'frame_crown') return { border: '4px solid #ffd700', boxShadow: '0 0 25px rgba(255,215,0,1), 0 0 50px rgba(255,215,0,0.4)' };
  // Fallbacks por keyword
  if (id.includes('gold')) return { border: '3px solid #ffd700', boxShadow: '0 0 15px rgba(255,215,0,0.6)' };
  if (id.includes('cyan') || id.includes('cyber')) return { border: '3px solid #00e5ff', boxShadow: '0 0 15px rgba(0,229,255,0.6)' };
  if (id.includes('pink') || id.includes('rose')) return { border: '3px solid #ff69b4', boxShadow: '0 0 15px rgba(255,105,180,0.6)' };
  if (id.includes('purple') || id.includes('galaxy')) return { border: '3px solid #b464ff', boxShadow: '0 0 15px rgba(180,100,255,0.6)' };
  if (id.includes('green') || id.includes('matrix')) return { border: '3px solid #39ff14', boxShadow: '0 0 15px rgba(57,255,20,0.6)' };
  if (id.includes('red') || id.includes('fire')) return { border: '3px solid #ff3300', boxShadow: '0 0 15px rgba(255,51,0,0.6)' };
  return { border: '3px solid var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' };
}

const TX_ICONS = {
  achievement: '🏆',
  game_reward: '🎮',
  page_visit: '🌐',
  daily_bonus: '🎁',
  purchase: '🛒',
  transfer_sent: '📤',
  transfer_received: '📥',
  migration: '📦',
  donation: '🤝',
};

function txLabel(type) {
  const map = {
    achievement: 'Logro', game_reward: 'Juego', page_visit: 'Visita',
    daily_bonus: 'Bonus diario', purchase: 'Compra', transfer_sent: 'Enviado',
    transfer_received: 'Recibido', migration: 'Migración', donation: 'Donación',
  };
  return map[type] || type;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sección: Economía ────────────────────────────────────────
function EconomySection({ user }) {
  const { balance, claimDaily, canClaimDaily } = useEconomy();
  const [txs, setTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [dailyMsg, setDailyMsg] = useState(null);

  // Transfer state
  const [tfQuery, setTfQuery] = useState('');
  const [tfResults, setTfResults] = useState([]);
  const [tfTarget, setTfTarget] = useState(null);
  const [tfAmount, setTfAmount] = useState('');
  const [tfMsg, setTfMsg] = useState('');
  const [tfStatus, setTfStatus] = useState(null);

  const handleDaily = async () => {
    try {
      const result = await claimDaily();
      setDailyMsg(result?.success
        ? `¡+${result.bonus ?? result.amount ?? 30} Dancoins! Bonus reclamado`
        : 'Ya reclamaste el bonus de hoy');
    } catch {
      setDailyMsg('Ya reclamaste el bonus de hoy');
    }
    setTimeout(() => setDailyMsg(null), 3000);
  };

  const loadTxs = async () => {
    if (txs.length) { setTxOpen(o => !o); return; }
    setTxLoading(true);
    try {
      const data = await getTransactionHistory(user.id, 30);
      setTxs(data || []);
    } catch (err) {
      console.error('[ProfilePage] tx history:', err);
    } finally {
      setTxLoading(false);
      setTxOpen(true);
    }
  };

  // User search for transfer
  const searchUsers = useCallback(async (q) => {
    if (q.length < 2) { setTfResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .limit(5);
    setTfResults(data || []);
  }, [user.id]);

  useEffect(() => { searchUsers(tfQuery); }, [tfQuery]);

  const handleTransfer = async () => {
    if (!tfTarget || !tfAmount) return;
    const amount = parseInt(tfAmount, 10);
    if (isNaN(amount) || amount < 10) { setTfStatus({ ok: false, msg: 'Mínimo 10 Dancoins' }); return; }
    try {
      const result = await transferCoins(user.id, tfTarget.id, amount, tfMsg || null);
      setTfStatus({ ok: true, msg: `✓ Enviados ${result.net_received} ◈ a ${tfTarget.username} (fee: ${result.fee} ◈)` });
      setTfTarget(null); setTfQuery(''); setTfAmount(''); setTfMsg('');
      setTfResults([]);
    } catch (err) {
      setTfStatus({ ok: false, msg: err.message || 'Error al transferir' });
    }
    setTimeout(() => setTfStatus(null), 5000);
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>◈ Dancoins</h2>

      {/* Balance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{
          padding: '14px 22px', border: '1px solid var(--accent)',
          background: 'rgba(255,110,180,0.06)', borderRadius: 8, minWidth: 160,
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.08em', marginBottom: 4 }}>BALANCE</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)' }}>◈ {balance.toLocaleString()}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {canClaimDaily() && (
            <button className="winButton" onClick={handleDaily}>
              🎁 Bonus diario (+30 ◈)
            </button>
          )}
          {dailyMsg && (
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{dailyMsg}</span>
          )}
        </div>
      </div>

      {/* Historial */}
      <button
        onClick={loadTxs}
        style={{
          background: 'none', border: '1px solid var(--border)', color: 'var(--text)',
          padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '0.82rem', borderRadius: 4, marginBottom: 10,
        }}
      >
        {txLoading ? 'Cargando...' : txOpen ? '▲ Ocultar historial' : '▼ Ver historial de transacciones'}
      </button>

      {txOpen && (
        <div style={{ overflowX: 'auto' }}>
          <table className="lbTable" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th style={{ textAlign: 'left' }}>Tipo</th>
                <th style={{ textAlign: 'left', maxWidth: 200 }}>Descripción</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'right' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.5, padding: 16 }}>Sin transacciones aún</td></tr>
              ) : txs.map(tx => {
                const positive = tx.amount > 0;
                return (
                  <tr key={tx.id}>
                    <td style={{ textAlign: 'center' }}>{TX_ICONS[tx.type] ?? '◈'}</td>
                    <td>{txLabel(tx.type)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
                      {tx.description || tx.reference || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: positive ? 'var(--accent)' : '#ff5555' }}>
                      {positive ? '+' : ''}{tx.amount}
                    </td>
                    <td style={{ textAlign: 'right', opacity: 0.6 }}>{tx.balance_after}</td>
                    <td style={{ textAlign: 'right', opacity: 0.5, whiteSpace: 'nowrap' }}>{fmtDate(tx.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transferencia */}
      <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--cyan)' }}>📤 Transferir Dancoins</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', opacity: 0.6 }}>Mínimo 10 ◈ · Comisión 5% · Máximo 500 ◈</p>

        {/* Search */}
        {!tfTarget ? (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              placeholder="Buscar usuario por nombre..."
              value={tfQuery}
              onChange={e => setTfQuery(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', padding: '7px 10px', fontFamily: 'inherit',
                fontSize: '0.85rem', borderRadius: 4, boxSizing: 'border-box',
              }}
            />
            {tfResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
              }}>
                {tfResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => { setTfTarget(u); setTfQuery(''); setTfResults([]); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                      : <span>👤</span>}
                    {u.username}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {tfTarget.avatar_url
              ? <img src={tfTarget.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
              : <span>👤</span>}
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{tfTarget.username}</span>
            <button
              onClick={() => setTfTarget(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', opacity: 0.5, fontSize: '0.85rem' }}
            >✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="number" min={10} max={500} placeholder="Cantidad (mín 10)"
            value={tfAmount} onChange={e => setTfAmount(e.target.value)}
            style={{
              width: 150, background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '7px 10px', fontFamily: 'inherit',
              fontSize: '0.85rem', borderRadius: 4,
            }}
          />
          <input
            placeholder="Mensaje opcional"
            value={tfMsg} onChange={e => setTfMsg(e.target.value)}
            style={{
              flex: 1, minWidth: 120, background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '7px 10px', fontFamily: 'inherit',
              fontSize: '0.85rem', borderRadius: 4,
            }}
          />
          <button
            className="winButton"
            onClick={handleTransfer}
            disabled={!tfTarget || !tfAmount}
            style={{ opacity: (!tfTarget || !tfAmount) ? 0.4 : 1 }}
          >
            Enviar
          </button>
        </div>

        {tfStatus && (
          <div style={{ marginTop: 8, fontSize: '0.82rem', color: tfStatus.ok ? 'var(--accent)' : '#ff5555' }}>
            {tfStatus.msg}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Sección: Fondo Comunitario ───────────────────────────────
function FundSection({ user }) {
  const { balance } = useEconomy();
  const [fund, setFund] = useState(null);
  const [donors, setDonors] = useState([]);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const f = await getActiveFund();
        if (!f) { setLoading(false); return; }
        setFund(f);
        const d = await getFundTopDonors(f.id, 5);
        setDonors(d || []);
      } catch (err) {
        console.error('[ProfilePage] fund:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDonate = async () => {
    const n = parseInt(amount, 10);
    if (!fund || isNaN(n) || n < 10) { setStatus({ ok: false, msg: 'Mínimo 10 Dancoins' }); return; }
    try {
      const result = await donateToFund(user.id, fund.id, n);
      setFund(prev => ({ ...prev, current_amount: result.fund_total }));
      setStatus({ ok: true, msg: `¡Donaste ${result.donated} ◈! ${result.goal_reached ? '🎉 ¡Meta alcanzada!' : ''}` });
      setAmount('');
      // Refresh donors
      const d = await getFundTopDonors(fund.id, 5);
      setDonors(d || []);
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Error al donar' });
    }
    setTimeout(() => setStatus(null), 4000);
  };

  if (loading) return null;
  if (!fund) return null;

  const pct = Math.min(100, Math.round(((fund.current_amount ?? 0) / (fund.goal_amount ?? 1)) * 100));

  return (
    <section style={{ marginBottom: 32, padding: 18, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(0,229,255,0.03)' }}>
      <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 6 }}>🤝 Fondo Comunitario</h2>
      <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: 'var(--text)', opacity: 0.8 }}>
        {fund.title} — {fund.description}
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
          <span style={{ color: 'var(--accent)' }}>◈ {(fund.current_amount ?? 0).toLocaleString()} recaudados</span>
          <span style={{ opacity: 0.6 }}>Meta: ◈ {(fund.goal_amount ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s', borderRadius: 4 }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', marginTop: 4, opacity: 0.5 }}>{pct}%</div>
      </div>

      {/* Top donors */}
      {donors.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', marginBottom: 6, letterSpacing: '0.05em' }}>TOP DONADORES</div>
          {donors.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 16, fontSize: '0.75rem', opacity: 0.5 }}>#{i + 1}</span>
              {d.user?.avatar_url
                ? <img src={d.user.avatar_url} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                : <span style={{ fontSize: 12 }}>👤</span>}
              <span style={{ fontSize: '0.85rem', flex: 1 }}>{d.user?.username || 'Anónimo'}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold' }}>◈ {d.amount}</span>
            </div>
          ))}
        </div>
      )}

      {/* Donate form */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number" min={10} placeholder="Cantidad (mín 10)"
          value={amount} onChange={e => setAmount(e.target.value)}
          style={{
            width: 160, background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '7px 10px', fontFamily: 'inherit',
            fontSize: '0.85rem', borderRadius: 4,
          }}
        />
        <button
          className="winButton"
          onClick={handleDonate}
          disabled={!amount || parseInt(amount, 10) < 10 || parseInt(amount, 10) > balance}
          style={{ opacity: (!amount || parseInt(amount, 10) < 10 || parseInt(amount, 10) > balance) ? 0.4 : 1 }}
        >
          Donar al fondo
        </button>
        {parseInt(amount, 10) > balance && (
          <span style={{ fontSize: '0.78rem', color: '#ff5555' }}>Saldo insuficiente</span>
        )}
      </div>
      {status && (
        <div style={{ marginTop: 8, fontSize: '0.82rem', color: status.ok ? 'var(--accent)' : '#ff5555' }}>
          {status.msg}
        </div>
      )}
    </section>
  );
}

export default function ProfileOwn() {
  const { user, profile, loading, loginWithGoogle, loginWithDiscord, logout } = useAuthContext();

  const [bannerColor, setBannerLocal] = useState(null);
  const [frameItemId, setFrameItemId] = useState(null);
  const [userAchs, setUserAchs] = useState([]);
  const [gameRanks, setGameRanks] = useState([]);
  const [cabinStats, setCabinStats] = useState(null);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('records');
  const [posts, setPosts] = useState([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!profile) return;
    setBannerLocal(profile.banner_color ?? null);
    setFrameItemId(profile.frame_item_id ?? null);
    setBio(profile.bio || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    let isMounted = true;

    async function loadComplementaryData() {
      try {
        const [achData, ranks, cStats, myPosts, socialInfo] = await Promise.all([
          supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id).then(res => res.data || []),
          getUserGameRanks(user.id).catch(() => []),
          getProductivityStats(user.id).catch(() => null),
          blogService.getUserPosts(user.id, true).catch(() => []),
          profileSocialService.getFollowCounts(user.id).catch(() => ({ followers: 0, following: 0 }))
        ]);

        if (!isMounted) return;
        setUserAchs(achData.map(a => a.achievement_id));
        setGameRanks(ranks);
        setCabinStats(cStats);
        setPosts(myPosts);
        setFollowCounts(socialInfo);
      } catch (err) {
        console.error('[ProfileOwn] load complementary data:', err);
      } finally {
        if (isMounted) setFetching(false);
      }
    }

    loadComplementaryData();
    return () => { isMounted = false; };
  }, [user]);

  if (loading || (!profile && user)) {
    return <div className="card"><h2 className="cardTitle blinkText">Cargando perfil...</h2></div>;
  }

  if (!user) {
    return (
      <main className="card">
        <h1 className="cardTitle">MI PERFIL</h1>
        <p>Inicia sesión para ver tu perfil, tus logros y récords en los juegos.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="winButton" onClick={loginWithGoogle}>Entrar con Google</button>
          <button className="winButton" onClick={loginWithDiscord}>Entrar con Discord</button>
        </div>
      </main>
    );
  }

  const unlockedAchData = ACHIEVEMENTS.filter(a => userAchs.includes(a.id));

  // --- GAMER STATS CALCULATION ---
  const totalXp = Math.floor(Math.max(0, (profile?.balance || 0) + (unlockedAchData.length * 150) + (gameRanks.length * 200) + ((cabinStats?.total_focus_minutes || 0) * 2)));
  const baseLevel = Math.max(1, Math.floor(0.1 * Math.sqrt(totalXp)));
  const level = baseLevel;
  const nextLevelXp = Math.floor(Math.pow((level + 1) / 0.1, 2));
  const prevLevelXp = Math.floor(Math.pow(level / 0.1, 2));
  const currentXpProgress = totalXp - prevLevelXp;
  const levelXpRequirement = nextLevelXp - prevLevelXp;
  const progressPercent = Math.min(100, Math.max(0, (currentXpProgress / levelXpRequirement) * 100));

  const rankNames = ['Recluta Espacial', 'Explorador Novato', 'Cazador Cósmico', 'Piloto Estelar', 'Vanguardia', 'Comandante', 'Arquitecto Estelar', 'Leyenda Cósmica', 'Deidad Astral'];
  const rankName = rankNames[Math.min(Math.floor(level / 3), rankNames.length - 1)];

  const topGlobalRank = gameRanks.length > 0 ? Math.min(...gameRanks.map(r => Number(r.user_position))) : 'N/A';
  const bestRecord = gameRanks.length > 0 ? Math.max(...gameRanks.map(g => g.max_score || 0)) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col gap-6" style={{ background: 'transparent' }}>

      {/* 1️⃣ HERO SECTION */}
      <section className="relative w-full rounded-b-3xl md:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)] bg-[#0d0d14] border border-white/5 pb-6">

        {/* Banner */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: bannerColor
              ? `linear-gradient(135deg, ${bannerColor}55 0%, ${bannerColor}22 100%)`
              : 'linear-gradient(135deg, rgba(255,110,180,0.15) 0%, rgba(0,229,255,0.08) 100%)'
          }}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col items-center text-center">

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <button className="winButton text-xs px-3 py-1 bg-black/40 backdrop-blur-md" onClick={logout}>Cerrar Sesión</button>
            <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider opacity-75 hover:opacity-100 transition font-bold mt-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded">
              🎨 Banner
              <input
                type="color" value={bannerColor || '#050510'}
                onChange={async (e) => {
                  const hex = e.target.value; setBannerLocal(hex);
                  try { await saveBannerColor(user.id, hex); } catch { }
                }}
                className="w-5 h-5 border-none bg-transparent cursor-pointer rounded p-0"
              />
            </label>
            {bannerColor && (
              <button onClick={async () => { setBannerLocal(null); try { await saveBannerColor(user.id, null); } catch { } }} className="text-[10px] uppercase opacity-50 hover:opacity-100">✕ quitar</button>
            )}
          </div>

          <div className="relative mb-6 mt-4 md:mt-0">
            <AvatarUploader
              currentAvatar={profile?.avatar_url}
              frameStyle={getFrameStyle(frameItemId)}
              onUploadSuccess={(newUrl) => setProfile(prev => ({ ...prev, avatar_url: newUrl }))}
            />

            {/* Pet Overlay */}
            <div className="absolute -left-6 -bottom-2 pointer-events-none drop-shadow-2xl z-30 scale-x-[-1]">
              <PetDisplay userId={user.id} size={45} showName={false} />
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#09090b] border border-cyan-500 text-cyan-400 text-xs font-black px-4 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] z-20 whitespace-nowrap">
              LVL {level}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-[0.1em] bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 drop-shadow-md">
              {profile?.username || user?.user_metadata?.full_name || (user?.email || '').split('@')[0] || 'Jugador'}
            </h1>
            <Link to="/onboarding" className="text-[10px] text-cyan-400 opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10" title="Cambiar identidad">
              ✏️ ID
            </Link>
          </div>
          <p className="text-[11px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-4 mt-1 opacity-90">
            {rankName}
          </p>


          {!isEditingBio ? (
            <div className="flex items-center gap-2 mb-6 group/bio bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/5 cursor-pointer max-w-md mx-auto w-full overflow-hidden" onClick={() => setIsEditingBio(true)}>
              <p className={`text-sm tracking-wide flex-1 break-words overflow-hidden ${bio ? 'text-gray-300' : 'text-gray-500 italic'}`}>"{bio || 'Sin biografía...'}"</p>
              <button className="text-[10px] text-cyan-400 opacity-0 group-hover/bio:opacity-100 transition-opacity">✏️ EDIT</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-md mb-6 z-20 animate-fade-in-up">
              <textarea
                autoFocus
                value={bio} onChange={e => setBio(e.target.value)} maxLength={250}
                className="w-full bg-[#050508] border border-cyan-500/50 rounded-xl p-3 text-sm text-white resize-none h-24 outline-none focus:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all"
                placeholder="Escribe tu bio..."
              />
              <div className="flex justify-end gap-2">
                <button className="winButton text-xs py-1 px-4" onClick={async () => {
                  try {
                    await supabase.from('profiles').update({ bio }).eq('id', user.id);
                    setIsEditingBio(false);
                  } catch { }
                }}>Guardar</button>
                <button className="text-xs px-3 opacity-60 hover:opacity-100 transition-opacity" onClick={() => { setBio(profile?.bio || ''); setIsEditingBio(false); }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* XP Bar */}
          <div className="w-full max-w-xs mt-2">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-widest">
              <span>{Math.floor(totalXp).toLocaleString()} XP</span>
              <span className="text-cyan-500">{Math.floor(nextLevelXp).toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 w-full bg-[#050508] rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 w-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/40 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {fetching ? (
        <div className="p-12 flex justify-center items-center">
          <span className="text-cyan-500 animate-pulse font-mono text-sm tracking-widest uppercase">cargando_red_estelar...</span>
        </div>
      ) : (
        <>
          {/* 2️⃣ STATS CORE GRID */}
          <section className="px-4 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mb-3 pl-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span> Core Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard title="Seguidores" value={followCounts.followers} icon="👥" highlight="text-purple-400" />
              <StatCard title="Siguiendo" value={followCounts.following} icon="✨" highlight="text-gray-400" />
              <StatCard title="Rank Global" value={topGlobalRank !== 'N/A' ? `#${topGlobalRank}` : '-'} icon="🌍" highlight="text-green-400" />
              <StatCard title="Racha Focus" value={`${cabinStats?.current_streak || 0} 🔥`} icon="⏳" highlight="text-orange-400" />
              <StatCard title="Juegos Activos" value={gameRanks.length} icon="🎮" />
              <StatCard title="Mejor Récord" value={bestRecord.toLocaleString()} icon="🏆" highlight="text-cyan-300" />
            </div>
          </section>

          {/* 3️⃣ TABS */}
          <section className="px-4 md:px-0 flex-1 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex bg-[#0a0a0f] rounded-xl p-1 shadow-lg border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
              <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')}>🏆 Récords</TabButton>
              <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>🎖️ Logros</TabButton>
              <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>📝 Posts</TabButton>
              <TabButton active={activeTab === 'economy'} onClick={() => setActiveTab('economy')}>💎 Economía</TabButton>
              <TabButton active={activeTab === 'cabina'} onClick={() => setActiveTab('cabina')}>🚀 Cabina</TabButton>
            </div>

            <div className="mt-5 flex-1 mb-8">

              {/* TAB: RECORDS */}
              {activeTab === 'records' && (
                <div className="animate-fade-in-up">
                  {gameRanks.length === 0 ? (
                    <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Sin récords registrados. ¡Empieza a jugar en el arcade!</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {gameRanks.map(rank => (
                        <div key={rank.game_id} className="flex bg-[#13131c] border border-white/5 rounded-xl p-3 items-center gap-4 hover:bg-[#1a1a26] transition hover:border-white/10 group cursor-default">
                          <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition shadow-inner">
                            🎮
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-[13px] text-gray-200 uppercase tracking-widest">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                            <p className="text-xs text-cyan-400 font-mono mt-0.5">Score: {(rank.max_score ?? 0).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col items-center justify-center px-4 py-2 bg-[#0a0a0f] rounded-lg border border-purple-500/20 shadow-md">
                            <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-0.5">Rank</span>
                            <span className="font-black text-purple-400 text-sm">#{rank.user_position}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ACHIEVEMENTS */}
              {activeTab === 'achievements' && (
                <div className="animate-fade-in-up">
                  <div className="mb-4 flex justify-between items-end px-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Insignias Desbloqueadas</span>
                    <span className="text-[11px] text-cyan-500 font-mono bg-cyan-900/20 px-2.5 py-1 rounded border border-cyan-800/40">{unlockedAchData.length}/{ACHIEVEMENTS.length}</span>
                  </div>
                  {unlockedAchData.length === 0 ? (
                    <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Aún no hay logros. ¡Explora el OS!</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {unlockedAchData.map(ach => (
                        <div key={ach.id} className="flex flex-col bg-gradient-to-br from-[#171724] to-[#0a0a0f] border border-purple-500/10 rounded-xl p-4 relative overflow-hidden group">
                          <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition duration-700"></div>
                          <div className="flex items-center justify-between mb-3 z-10">
                            <div className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{ach.icon}</div>
                            <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/50 flex items-center justify-center text-green-400 text-[10px]">✓</div>
                          </div>
                          <div className="z-10">
                            <div className="font-bold text-[13px] text-white tracking-wide">{ach.title}</div>
                            <div className="text-[11px] text-gray-400 leading-snug mt-1 opacity-80 group-hover:opacity-100 transition whitespace-pre-wrap">{ach.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: POSTS */}
              {activeTab === 'posts' && (
                <div className="animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4 px-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Mis Publicaciones</span>
                    <Link to="/posts" className="winButton text-xs py-1 px-3">
                      Ir al Feed Global 🌍
                    </Link>
                  </div>
                  <div className="flex flex-col gap-3">
                    {posts.length === 0 ? (
                      <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Aún no has escrito ningún post.</div>
                    ) : (
                      posts.map(post => (
                        <div key={post.id} className="block bg-[#13131c]/60 backdrop-blur-md p-5 rounded-xl border border-white/5 transition-colors group">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] text-cyan-500 font-mono tracking-widest bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-800/40">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-bold ${post.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {post.status}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono tracking-widest ml-auto opacity-60 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                              👁 {post.views || 0}
                            </span>
                          </div>

                          <Link to={post.status === 'published' ? `/log/${post.slug}` : '#'} className="block my-2">
                            <h3 className="text-lg font-bold text-gray-100 group-hover:text-cyan-400 transition-colors mb-1">{post.title}</h3>
                            {post.subtitle && <p className="text-sm text-gray-400">{post.subtitle}</p>}
                          </Link>

                          <div className="flex justify-end mt-4">
                            <Link to={`/edit-post/${post.id}`} className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1">Editar</Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-8 flex justify-center">
                    <Link to="/create-post" className="btn-accent px-8 py-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 font-bold tracking-widest uppercase text-xs">
                      <span className="text-lg leading-none">+</span> Crear Nuevo Post
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB: ECONOMY */}
              {activeTab === 'economy' && (
                <div className="animate-fade-in-up flex flex-col gap-6">
                  <EconomySection user={user} />
                  <FundSection user={user} />
                </div>
              )}

              {/* TAB: CABINA */}
              {activeTab === 'cabina' && (
                <div className="animate-fade-in-up">
                  <div className="bg-[#13131c] rounded-2xl border border-white/5 p-6 md:p-8 relative overflow-hidden shadow-xl">
                    {/* Estética sci-fi */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>

                    <h3 className="text-xs text-cyan-500 uppercase tracking-[0.2em] font-bold mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rotate-45"></span> Telemetría de Foco
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Horas de Enfoque</span>
                        <span className="text-2xl font-black text-white font-mono">{Math.round((cabinStats?.total_focus_minutes || 0) / 60)}<span className="text-gray-500 text-sm ml-1">h</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Sesiones Totales</span>
                        <span className="text-2xl font-black text-white font-mono">{cabinStats?.total_sessions || 0}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Racha Actual</span>
                        <span className="text-2xl font-black text-orange-400 font-mono">{cabinStats?.current_streak || 0}<span className="text-gray-500 text-sm ml-1">d</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Dancoins Ganadas</span>
                        <span className="text-2xl font-black text-cyan-400 font-mono">◈ {cabinStats?.dancoins_earned || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        </>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES REUTILIZABLES ---
function StatCard({ title, value, icon, highlight = 'text-white' }) {
  return (
    <div className="bg-[#13131c] p-3 md:p-4 rounded-xl border border-white/5 flex flex-col justify-center items-center text-center hover:bg-[#1a1a26] transition shadow-md relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-[1.8] group-hover:rotate-45 transition duration-500">{icon}</div>
      <div className="text-xl mb-1 relative z-10">{icon}</div>
      <div className={`text-xl md:text-2xl font-black leading-none ${highlight} relative z-10 drop-shadow-md`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-2 relative z-10">{title}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 text-[11px] md:text-sm font-bold rounded-lg transition-all whitespace-nowrap tracking-wide ${active
        ? 'bg-[#1a1a26] text-white shadow-md border border-white/10'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
        }`}
    >
      {children}
    </button>
  );
}
