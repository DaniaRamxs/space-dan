import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import { supabase } from '../supabaseClient';
import { ACHIEVEMENTS } from '../hooks/useAchievements';
import { getUserGameRanks } from '../services/supabaseScores';
import { getTransactionHistory, getActiveFund, getFundTopDonors, donateToFund, transferCoins } from '../services/economy';
import { getProductivityStats } from '../services/productivity';
import { setBannerColor as saveBannerColor } from '../services/store';
import PetDisplay from '../components/PetDisplay';

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

// ── Página principal ─────────────────────────────────────────
export default function ProfilePage() {
  const { user, loginWithGoogle, loginWithDiscord, logout, loading } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [bannerColor, setBannerLocal] = useState(null);
  const [frameItemId, setFrameItemId] = useState(null);
  const [userAchs, setUserAchs] = useState([]);
  const [gameRanks, setGameRanks] = useState([]);
  const [cabinStats, setCabinStats] = useState(null);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);

    async function loadProfileData() {
      try {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (profData) {
          setProfile(profData);
          setBannerLocal(profData.banner_color ?? null);
          setFrameItemId(profData.frame_item_id ?? null);
          setBio(profData.bio || '');
        }

        const { data: achData } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);
        if (achData) setUserAchs(achData.map(a => a.achievement_id));

        const ranks = await getUserGameRanks(user.id);
        setGameRanks(ranks || []);

        const cStats = await getProductivityStats(user.id);
        setCabinStats(cStats);
      } catch (err) {
        console.error('[ProfilePage] load:', err);
      } finally {
        setFetching(false);
      }
    }

    loadProfileData();
  }, [user?.id]);

  if (loading) {
    return <div className="card"><h2 className="cardTitle">Cargando perfil...</h2></div>;
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

  return (
    <main className="card profileCard">
      {/* Header */}
      <div
        className="profileHeader"
        style={{
          padding: '30px', display: 'flex', alignItems: 'center', gap: 25,
          borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
          background: bannerColor
            ? `linear-gradient(135deg, ${bannerColor}55 0%, ${bannerColor}22 100%)`
            : 'linear-gradient(135deg, rgba(255,110,180,0.1) 0%, rgba(0,229,255,0.05) 100%)',
          transition: 'background 0.4s',
        }}
      >
        <div
          className="avatarFrame"
          style={{
            width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
            flexShrink: 0, ...getFrameStyle(frameItemId),
          }}
        >
          <img
            src={profile?.avatar_url || '/dan_profile.jpg'}
            alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 style={{ margin: 0, color: 'var(--text)', fontSize: '2rem', textShadow: '0 0 10px var(--glow)' }}>
                {profile?.username || user?.user_metadata?.full_name || (user?.email || '').split('@')[0] || 'Jugador'}
              </h1>
              <p style={{ margin: '5px 0 0 0', color: 'var(--cyan)', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ⭐ Viajero del Dan-Space
              </p>

              <div style={{ marginTop: 12 }}>
                {!isEditingBio ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8, maxWidth: '400px', fontStyle: bio ? 'normal' : 'italic' }}>
                      {bio || 'Aún no has escrito tu biografía estelar...'}
                    </p>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                    >
                      [editar]
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '400px' }}>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={250}
                      style={{
                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)',
                        borderRadius: 8, color: '#fff', fontSize: '0.85rem', padding: 8,
                        minHeight: '60px', fontFamily: 'inherit'
                      }}
                      placeholder="Escribe algo sobre ti..."
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="winButton"
                        style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                        onClick={async () => {
                          try {
                            await supabase.from('profiles').update({ bio }).eq('id', user.id);
                            setIsEditingBio(false);
                          } catch (err) { alert('Error al guardar'); }
                        }}
                      >
                        Guardar
                      </button>
                      <button
                        className="winButton"
                        style={{ fontSize: '0.7rem', padding: '4px 10px', opacity: 0.5 }}
                        onClick={() => {
                          setBio(profile?.bio || '');
                          setIsEditingBio(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Mascota con accesorios equipados */}
            <PetDisplay userId={user.id} size={70} showName />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button className="winButton" onClick={logout} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Cerrar Sesión
              </button>
              {/* Banner color picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', opacity: 0.75 }}>
                  🎨 Banner
                  <input
                    type="color"
                    value={bannerColor || '#050510'}
                    onChange={async (e) => {
                      const hex = e.target.value;
                      setBannerLocal(hex);
                      try { await saveBannerColor(user.id, hex); } catch { }
                    }}
                    style={{ width: 28, height: 22, border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }}
                  />
                </label>
                {bannerColor && (
                  <button
                    onClick={async () => {
                      setBannerLocal(null);
                      try { await saveBannerColor(user.id, null); } catch { }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', opacity: 0.45, fontSize: '0.75rem' }}
                  >
                    ✕ quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {fetching ? (
        <div style={{ padding: 30, textAlign: 'center' }}>
          <span className="blinkText" style={{ color: 'var(--accent)' }}>cargando_datos...</span>
        </div>
      ) : (
        <div style={{ padding: '24px 28px' }}>

          {/* Economía */}
          <EconomySection user={user} />

          {/* Fondo comunitario */}
          <FundSection user={user} />

          {/* Actividad en Cabina */}
          <section style={{ marginBottom: 32 }}>
            <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>🚀 Actividad en Cabina</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 15 }}>
              <ProfileStatCard label="Horas de Enfoque" value={`${Math.round((cabinStats?.total_focus_minutes || 0) / 60)}h`} icon="⏳" />
              <ProfileStatCard label="Sesiones Totales" value={cabinStats?.total_sessions || 0} icon="✨" />
              <ProfileStatCard label="Racha Actual" value={`${cabinStats?.current_streak || 0}d`} icon="🔥" />
              <ProfileStatCard label="Coins de Órbita" value={cabinStats?.dancoins_earned || 0} icon="◈" />
            </div>
          </section>

          {/* Récords */}
          <section style={{ marginBottom: 32 }}>
            <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>🎮 Récords Personales</h2>
            {gameRanks.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Aún no has jugado ningún juego o no tienes un récord registrado.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
                {gameRanks.map(rank => (
                  <div key={rank.game_id} style={{
                    padding: 15, border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                  }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {GAME_NAMES[rank.game_id] || rank.game_id}
                    </h3>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)' }}>
                      {(rank.max_score ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: 8, fontWeight: 'bold' }}>
                      Puesto Global: <span style={{ color: 'var(--text)' }}>#{rank.user_position}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Logros */}
          <section>
            <h2 className="cardTitle" style={{ fontSize: '1.1rem', marginBottom: 14 }}>
              🏆 Logros Desbloqueados ({unlockedAchData.length}/{ACHIEVEMENTS.length})
            </h2>
            {unlockedAchData.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Aún no has desbloqueado logros. ¡Sigue explorando!</p>
            ) : (
              <div className="achGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {unlockedAchData.map(ach => (
                  <div key={ach.id} className="achCard unlocked">
                    <div className="achCardIcon">{ach.icon}</div>
                    <div className="achCardBody">
                      <div className="achCardTitle">{ach.title}</div>
                      <div className="achCardDesc">{ach.desc}</div>
                    </div>
                    <div className="achCardCheck">✓</div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </main>
  );
}

function ProfileStatCard({ label, value, icon }) {
  return (
    <div style={{
      padding: 15, border: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.02)', borderRadius: 8,
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}
