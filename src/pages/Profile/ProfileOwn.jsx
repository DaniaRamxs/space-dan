import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import ActivityFeed from '../../components/Social/ActivityFeed';
import PostComposer from '../../components/Social/PostComposer';
import BlogPostCard from '../../components/Social/BlogPostCard';
import { supabase } from '../../supabaseClient';
import { ACHIEVEMENTS } from '../../hooks/useAchievements';
import { getUserGameRanks } from '../../services/supabaseScores';
import { getTransactionHistory, getActiveFund, getFundTopDonors, donateToFund, transferCoins } from '../../services/economy';
import { getProductivityStats } from '../../services/productivity';
import * as storeService from '../../services/store';
import { blogService } from '../../services/blogService';
import PetDisplay from '../../components/PetDisplay';
import { Link } from 'react-router-dom';
import AvatarUploader from '../../components/AvatarUploader';
import { profileSocialService } from '../../services/profile_social';
import { PrivateUniverse } from '../../components/PrivateUniverse';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';
import { useUniverse } from '../../contexts/UniverseContext.jsx';
import { universeService } from '../../services/universe';
import { motion, AnimatePresence } from 'framer-motion';
import '../../banner-effects.css';
import '../../styles/NicknameStyles.css';

const GAME_NAMES = {
  asteroids: 'Asteroids', tetris: 'Tetris', snake: 'Snake', pong: 'Pong',
  memory: 'Memory', ttt: 'Tic Tac Toe', whack: 'Whack-a-Mole', color: 'Color Match',
  reaction: 'Reaction Time', '2048': '2048', blackjack: 'Blackjack',
  puzzle: 'Sliding Puzzle', invaders: 'Space Invaders', breakout: 'Breakout',
  flappy: 'Flappy Bird', mines: 'Buscaminas', dino: 'Dino Runner',
  connect4: 'Connect Four', simon: 'Simon Says', cookie: 'Cookie Clicker',
  maze: 'Maze', catch: 'Catch Game', dodge: 'Dodge Game',
};

import { getFrameStyle, getLinkedFrameStyle, getLinkedGlowClass } from '../../utils/styles';

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
    <section className="profile-v2-section space-y-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white/40">Sistema Económico</h2>
          <p className="text-xs text-white/20">Gestiona tus Dancoins y transferencias intergalácticas.</p>
        </div>
        <div className="text-3xl">💎</div>
      </div>

      {/* Balance Glass Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative p-8 rounded-[2rem] bg-gradient-to-br from-pink-500/10 to-purple-500/5 border border-white/10 overflow-hidden group/bal">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/20 blur-[60px] rounded-full group-hover/bal:scale-150 transition-transform duration-1000"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400/80 mb-2 block">Saldo Disponible</span>
            <div className="text-5xl font-black text-white flex items-baseline gap-3">
              <span className="text-pink-500 text-3xl">◈</span>
              {balance.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          {canClaimDaily() ? (
            <button
              className="w-full py-4 bg-white text-black font-black text-xs rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden group/daily"
              onClick={handleDaily}
            >
              <span className="relative z-10 uppercase tracking-widest">Reclamar Bonus Diario</span>
              <span className="text-xl">🎁</span>
            </button>
          ) : (
            <div className="w-full py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 text-center">
              Próximo bonus disponible mañana
            </div>
          )}
          {dailyMsg && (
            <div className="text-center animate-bounce">
              <span className="text-xs font-bold text-pink-400 bg-pink-400/10 px-4 py-2 rounded-full border border-pink-400/20">{dailyMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Historial Premium */}
      <div className="space-y-4">
        <button
          onClick={loadTxs}
          className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
        >
          {txLoading ? 'Cargando registros...' : txOpen ? '▼ Ocultar transacciones' : '▶ Ver historial de transacciones'}
        </button>

        {txOpen && (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <table className="profile-v2-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-white/20 py-12">No hay movimientos registrados.</td></tr>
                ) : txs.map(tx => {
                  const positive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="group/row">
                      <td className="w-12 text-center opacity-40 group-hover/row:opacity-100 transition-opacity">{TX_ICONS[tx.type] ?? '◈'}</td>
                      <td className="text-xs font-bold text-white/80">{txLabel(tx.type)}</td>
                      <td className="text-xs text-white/40 max-w-[200px] truncate">{tx.description || tx.reference || '—'}</td>
                      <td className={`text-right font-black font-mono ${positive ? 'text-green-400' : 'text-rose-500'}`}>
                        {positive ? '+' : ''}{tx.amount} ◈
                      </td>
                      <td className="text-right text-[10px] text-white/20 font-mono">{fmtDate(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transferencia Premium */}
      <div className="relative p-8 rounded-[2rem] bg-indigo-500/5 border border-white/5 overflow-hidden group/transfer">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full"></div>

        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Transferir Dancoins
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Destinatario</label>
            {!tfTarget ? (
              <div className="relative">
                <input
                  placeholder="Escribe nombre de usuario..."
                  value={tfQuery}
                  onChange={e => setTfQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
                {tfResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-indigo-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                    {tfResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => { setTfTarget(u); setTfQuery(''); setTfResults([]); }}
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : '👤'}
                        </div>
                        <span className="text-sm font-bold text-white/80">{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-white/5 border border-indigo-500/30 rounded-xl ring-4 ring-indigo-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-indigo-500/50 overflow-hidden">
                    {tfTarget.avatar_url ? <img src={tfTarget.avatar_url} className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-tighter">{tfTarget.username}</span>
                </div>
                <button onClick={() => setTfTarget(null)} className="text-white/20 hover:text-white transition-colors">✕</button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Detalles del Envío</label>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Monto"
                value={tfAmount} onChange={e => setTfAmount(e.target.value)}
                className="w-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-center font-black outline-none focus:border-indigo-500"
              />
              <input
                placeholder="Mensaje (opcional)..."
                value={tfMsg} onChange={e => setTfMsg(e.target.value)}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Fee de red: 5% · Min. 10 ◈</p>
          <button
            className={`px-8 py-3 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${(!tfTarget || !tfAmount) ? 'bg-white/5 text-white/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_5px_20px_rgba(79,70,229,0.3)]'}`}
            onClick={handleTransfer}
            disabled={!tfTarget || !tfAmount}
          >
            EJECUTAR TRANSFERENCIA
          </button>
        </div>

        {tfStatus && (
          <div className={`mt-6 p-4 rounded-xl border text-xs font-bold text-center animate-fade-in ${tfStatus.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
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
    <section className="profile-v2-section glass-blue space-y-8">
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-cyan-400">Fondo Comunitario</h2>
          <p className="text-xs text-white/20">Impulsa proyectos colectivos del universo.</p>
        </div>
        <div className="text-3xl">🤝</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
            <h3 className="text-xl font-black italic text-white leading-tight">{fund.title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{fund.description}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-cyan-400">Recaudado: ◈ {(fund.current_amount ?? 0).toLocaleString()}</span>
              <span className="text-white/20">Meta: ◈ {(fund.goal_amount ?? 0).toLocaleString()}</span>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                style={{ width: `${pct}%` }}
              ></div>
            </div>
            <div className="text-right text-[10px] font-black text-cyan-400/60">{pct}% COMPLETADO</div>
          </div>
        </div>

        <div className="space-y-6">
          {donors.length > 0 && (
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Contribuyentes Relevantes</span>
              <div className="space-y-2">
                {donors.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] font-black text-cyan-500/40 font-mono">#{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden border border-white/10">
                      {d.user?.avatar_url ? <img src={d.user.avatar_url} className="w-full h-full object-cover" /> : '👤'}
                    </div>
                    <span className="text-xs font-bold text-white/80 flex-1">{d.user?.username || 'Anónimo'}</span>
                    <span className="text-xs font-black text-cyan-400">◈ {d.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="number" min={10}
                placeholder="Cantidad..."
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-1/2 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-cyan-500"
              />
              <button
                className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${(!amount || parseInt(amount, 10) < 10) ? 'bg-white/5 text-white/20' : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_10px_30px_rgba(6,182,212,0.2)]'}`}
                onClick={handleDonate}
                disabled={!amount || parseInt(amount, 10) < 10 || parseInt(amount, 10) > balance}
              >
                APORTAR AL FONDO
              </button>
            </div>
            {parseInt(amount, 10) > balance && <p className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Saldo insuficiente detectado</p>}
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl border text-xs font-bold text-center animate-fade-in ${status.ok ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {status.msg}
        </div>
      )}
    </section>
  );
}

function MoodManager({ profile, user }) {
  const [moodText, setMoodText] = useState(profile?.mood_text || '');
  const [moodEmoji, setMoodEmoji] = useState(profile?.mood_emoji || '✨');
  const [duration, setDuration] = useState(24);
  const [saving, setSaving] = useState(false);
  const [mbti, setMbti] = useState(profile?.mbti || '');
  const [zodiac, setZodiac] = useState(profile?.zodiac || '');
  const [pronouns, setPronouns] = useState(profile?.pronouns || '');
  const [socials, setSocials] = useState(profile?.social_links || []);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSaveMood = async () => {
    setSaving(true);
    try {
      await supabase.rpc('set_user_mood', {
        p_text: moodText,
        p_emoji: moodEmoji,
        p_duration_hours: duration === -1 ? null : duration
      });
      alert('Mood estelar actualizado 🚀');
    } catch (err) {
      console.error(err);
      alert('Error en protocolos de mood');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdentity = async () => {
    setSaving(true);
    try {
      await supabase.from('profiles').update({ mbti, zodiac, pronouns, social_links: socials }).eq('id', user.id);
      alert('Identidad sincronizada ✓');
    } catch (err) {
      alert('Fallo en sincronización');
    } finally {
      setSaving(false);
    }
  };

  const emojis = ['✨', '🌌', '🚀', '🔭', '🛸', '🌑', '🔋', '💤', '🔥', '🎮', '💻', '🧪', '🧠', '🎧', '⚡'];

  const socialPlatforms = [
    { id: 'twitter', name: 'X / Twitter', icon: '🐦' },
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'github', name: 'GitHub', icon: '💻' },
    { id: 'discord', name: 'Discord', icon: '👾' },
    { id: 'youtube', name: 'YouTube', icon: '📺' },
    { id: 'spotify', name: 'Spotify', icon: '🎵' },
    { id: 'custom', name: 'Enlace', icon: '🔗' },
  ];

  const handleAddSocial = () => {
    if (socials.length >= 5) return;
    setSocials([...socials, { platform: 'custom', url: '' }]);
  };

  const updateSocial = (index, field, value) => {
    const newSocials = [...socials];
    newSocials[index][field] = value;
    setSocials(newSocials);
  };

  const removeSocial = (index) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  return (
    <div className="profile-v2-section glass-blue space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Mood Editor */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            Estado Vibracional (Mood)
          </h3>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl hover:border-cyan-500/50 transition-all active:scale-95 mx-auto sm:mx-0"
              >
                {moodEmoji}
              </button>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-3 p-4 bg-[#0a0a0f] border border-white/10 rounded-2xl grid grid-cols-5 gap-3 z-[100] shadow-2xl backdrop-blur-2xl w-[260px]"
                  >
                    {emojis.map(e => (
                      <button
                        key={e}
                        onClick={() => { setMoodEmoji(e); setShowEmojiPicker(false); }}
                        className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1"
                      >
                        {e}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input
              value={moodText}
              onChange={e => setMoodText(e.target.value)}
              placeholder="¿Qué energía emites hoy?..."
              maxLength={60}
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-cyan-500 transition-all text-center sm:text-left"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {[2, 8, 24, -1].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${duration === d ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                >
                  {d === -1 ? 'Infinito' : `${d}h`}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveMood}
              disabled={saving}
              className="w-full py-4 bg-white text-black font-black text-[11px] uppercase rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
            >
              {saving ? 'PROCESANDO...' : 'TRANSMITIR FRECUENCIA'}
            </button>
          </div>
        </div>

        {/* Vital Info Editor */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Firma de Identidad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/20 uppercase ml-1">Tipo MBTI</label>
              <select
                value={mbti}
                onChange={e => setMbti(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white appearance-none outline-none focus:border-purple-500"
              >
                <option value="">Desconocido</option>
                {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/20 uppercase ml-1">Signo Zodiacal</label>
              <select
                value={zodiac}
                onChange={e => setZodiac(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white appearance-none outline-none focus:border-purple-500"
              >
                <option value="">Estelar</option>
                {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/20 uppercase ml-1">Pronombres</label>
            <input
              value={pronouns}
              onChange={e => setPronouns(e.target.value)}
              placeholder="él / ella / ellos / ..."
              maxLength={20}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>

          {/* Social Links Editor */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-white/20 uppercase ml-1">Vínculos Sociales ({socials.length}/5)</label>
              {socials.length < 5 && (
                <button onClick={handleAddSocial} className="text-[10px] font-black text-purple-400 hover:text-white transition-colors">+ Añadir</button>
              )}
            </div>

            <div className="space-y-3">
              {socials.map((s, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center animate-fade-in bg-black/20 p-3 rounded-2xl sm:bg-transparent sm:p-0">
                  <div className="flex gap-2 items-center flex-1">
                    <select
                      value={s.platform}
                      onChange={e => updateSocial(idx, 'platform', e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white outline-none min-w-[100px]"
                    >
                      {socialPlatforms.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                    </select>
                    <input
                      value={s.url}
                      onChange={e => updateSocial(idx, 'url', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-purple-500"
                    />
                    <button onClick={() => removeSocial(idx)} className="text-rose-500/50 hover:text-rose-500 transition-colors p-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveIdentity}
            disabled={saving}
            className="w-full py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 font-black text-[10px] uppercase rounded-2xl hover:bg-purple-600/30 transition-all"
          >
            SINCRONIZAR FIRMA
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileOwn() {
  const { user, profile, loading, loginWithGoogle, loginWithDiscord, logout } = useAuthContext();
  const { nicknameStyle, primaryRole, secondaryRole, mood, ambientSound, isAmbientMuted, toggleAmbientMute, partnership: contextPartnership } = useUniverse();
  const [isSharing, setIsSharing] = useState(false);
  const isOwnProfile = true;
  const partnership = contextPartnership;

  const handleShare = () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/@${profile.username}`;
    navigator.clipboard.writeText(url);
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 2000);
  };

  const getSocialIcon = (id) => {
    const icons = {
      twitter: '🐦',
      instagram: '📸',
      github: '💻',
      discord: '👾',
      youtube: '📺',
      spotify: '🎵',
      custom: '🔗'
    };
    return icons[id] || '🔗';
  };
  const navigate = useNavigate();

  const [bannerColor, setBannerLocal] = useState(null);
  const [frameItemId, setFrameItemId] = useState(null);
  const [userAchs, setUserAchs] = useState([]);
  const [gameRanks, setGameRanks] = useState([]);
  const [cabinStats, setCabinStats] = useState(null);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('records');
  const [activityFilter, setActivityFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [bannerItem, setBannerItem] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setBannerLocal(profile.banner_color ?? null);
    setFrameItemId(profile.frame_item_id ?? null);
    setBio(profile.bio || '');

    // Use pre-loaded items from auth context if available
    if (profile.banner_item) {
      setBannerItem(profile.banner_item);
    } else if (profile.banner_item_id) {
      // Fallback: fetch if not joined (though useAuth now joins it)
      storeService.getStoreItem(profile.banner_item_id)
        .then(setBannerItem)
        .catch(err => console.error('[ProfileOwn] Error fetching banner item:', err));
    } else {
      setBannerItem(null);
    }
    if (profile) {
      document.title = "Mi Perfil | Space Dan";
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    let isMounted = true;

    async function loadComplementaryData() {
      try {
        const [achData, ranks, cStats, myPosts, socialInfo, profileComments, pData] = await Promise.all([
          supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id).then(res => res.data || []),
          getUserGameRanks(user.id).catch(() => []),
          getProductivityStats(user.id).catch(() => null),
          blogService.getUserPosts(user.id, true).catch(() => []),
          profileSocialService.getFollowCounts(user.id).catch(() => ({ followers: 0, following: 0 })),
          profileSocialService.getProfileComments(user.id).catch(() => [])
        ]);

        if (!isMounted) return;
        setUserAchs(achData.map(a => a.achievement_id));
        setGameRanks(ranks);
        setCabinStats(cStats);
        setPosts(myPosts);
        setFollowCounts(socialInfo);
        setComments(profileComments);
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const added = await profileSocialService.addProfileComment(user.id, newComment);
      setComments(prev => [added, ...prev]);
      setNewComment('');
    } catch (err) {
      alert('Error al publicar: ' + (err.message || 'Desconocido'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('¿Eliminar transmisión del muro?')) return;
    try {
      await profileSocialService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert('Error al eliminar comentario');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col gap-12 pt-8" style={{ background: 'transparent' }}>

      {/* 1️⃣ HERO SECTION (v2.5) */}
      <section className="profile-v2-hero relative w-full rounded-[3rem] overflow-hidden border border-white/10 group/hero">

        {/* Mesh Background — subtle, no filter */}
        <div className="profile-v2-mesh opacity-20 group-hover/hero:opacity-30 transition-opacity duration-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-[0.04] pointer-events-none"></div>

        {/* Dynamic Banner Overlay / Custom Shop Banner */}
        <div
          className={`profile-v2-banner-overlay transition-all duration-1000 ${bannerItem ? 'animate-pulse-slow' : ''} ${bannerItem?.metadata?.animated ? 'animate-aurora' : ''}`}
          style={{
            backgroundImage: [
              bannerItem?.preview_url ? `url(${bannerItem.preview_url})` : null,
              bannerItem?.metadata?.gradient
                ? `linear-gradient(to right, ${bannerItem.metadata.gradient.join(', ')})`
                : (bannerItem?.metadata?.hex
                  ? `radial-gradient(circle at top right, ${bannerItem.metadata.hex}66 0%, transparent 70%)`
                  : (bannerColor
                    ? `radial-gradient(circle at top right, ${bannerColor}66 0%, transparent 60%)`
                    : 'radial-gradient(circle at top right, rgba(236,72,153,0.2) 0%, transparent 60%)'
                  )
                )
            ].filter(Boolean).join(', '),
            backgroundSize: bannerItem?.preview_url ? 'cover, auto' : 'auto',
            backgroundPosition: bannerItem?.preview_url ? 'center, center' : 'center',
            opacity: bannerItem?.preview_url ? 0.7 : 1
          }}
        >
          {bannerItem?.metadata?.fx === 'matrix' && <div className="absolute inset-0 banner-fx-matrix opacity-80 z-10"></div>}
          {bannerItem?.metadata?.fx === 'scanlines' && <div className="absolute inset-0 banner-fx-scanlines opacity-30"></div>}
          {bannerItem?.metadata?.fx === 'stars' && <div className="absolute inset-0 banner-fx-stars"></div>}

          {/* V3 Identity Floating Panel - Positioned top-right with extreme margins to stay clear */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20 flex flex-col items-end gap-2 pointer-events-none scale-90 md:scale-100 origin-top-right">
            {mood?.text && !mood.isExpired && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
              >
                <span className="text-3xl animate-bounce-slow drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{mood.emoji || '✨'}</span>
                <div className="text-right">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Frecuencia Actual</div>
                  <div className="text-xs font-bold text-white/90 italic tracking-wide">"{mood.text}"</div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-2">
              {profile?.mbti && (
                <div className="bg-purple-500/20 backdrop-blur-md border border-purple-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-300">MBTI:</span>
                  <span className="text-[10px] font-black text-white">{profile.mbti}</span>
                </div>
              )}
              {profile?.zodiac && (
                <div className="bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] font-black text-cyan-300">SIGNO:</span>
                  <span className="text-[10px] font-black text-white">{profile.zodiac}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 p-8 pt-32 md:pt-24 md:p-16 flex flex-col items-center text-center">
          {/* Overlay: solo bottom fade para legibilidad — NO cubre el centro */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none z-0"></div>

          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Top Actions */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col items-end gap-2 md:gap-3 z-40">
              {ambientSound && (
                <button
                  onClick={toggleAmbientMute}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-[10px] flex items-center justify-center hover:bg-white/10 transition-all shadow-xl"
                  title={isAmbientMuted ? "Activar Sonido" : "Silenciar"}
                >
                  {isAmbientMuted ? '🔇' : '🔊'}
                </button>
              )}
            </div>

            <div className="relative mb-6 mt-20 md:mt-0 group/avatar">
              {/* Aura Glow removida para optimización móvil y corregir persistencia */}

              <AvatarUploader
                currentAvatar={profile?.avatar_url}
                frameStyle={getFrameStyle(frameItemId || profile?.frame_item_id)}
                isLv5={(frameItemId || profile?.frame_item_id) === 'frame_link_lv5'}
                onUploadSuccess={(newUrl) => {
                  // El perfil se actualizará mediante la suscripción en real-time de useAuth
                  console.log('Avatar actualizado:', newUrl);
                }}
              />

              {/* Pet Overlay & Holographic Level Badge */}
              <div className="absolute -left-12 -bottom-4 pointer-events-none drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] z-30 scale-x-[-1] animate-float">
                <PetDisplay userId={user.id} size={60} showName={false} />
              </div>

              <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl border font-black text-sm tracking-tighter z-20 whitespace-nowrap transition-all duration-500 shadow-2xl ${level >= 10 ? 'bg-gradient-to-r from-yellow-400 via-white to-yellow-400 text-black border-yellow-200 animate-shimmer bg-[length:200%_100%]' : 'bg-[#09090b] border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}>
                NIVEL {level}
              </div>

              {/* Racha Estelar Badge */}
              {profile?.streak > 0 && (
                <div className="absolute -top-5 right-1/2 translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 border border-yellow-200/50 shadow-[0_0_15px_rgba(249,115,22,0.4)] z-20 flex items-center gap-2 animate-bounce-slow">
                  <span className="text-lg">🔥</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{profile.streak} DÍAS</span>
                    <span className="text-[7px] font-bold text-white/80 uppercase">Racha Estelar</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 mt-4 relative z-10">
              <h1 className={`text-3xl md:text-5xl font-black uppercase tracking-[0.1em] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] ${getNicknameClass(profile) || 'from-white via-white to-gray-300 bg-clip-text text-transparent bg-gradient-to-b'}`}>
                {getUserDisplayName(profile || { username: user?.user_metadata?.full_name || (user?.email || '').split('@')[0] })}
              </h1>
              {profile?.pronouns ? (
                <span className="px-4 py-1.5 rounded-full bg-black/60 border border-white/20 text-[10px] font-black text-white uppercase tracking-[0.2em] backdrop-blur-md shadow-lg animate-fade-in ring-1 ring-white/10">
                  {profile.pronouns}
                </span>
              ) : isOwnProfile && (
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic drop-shadow-sm">Sin pronombres configurados</span>
              )}
              <div className="flex items-center gap-3 mt-1">
                <Link to="/onboarding" className="text-[10px] text-cyan-400 font-black flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all shadow-lg" title="Cambiar identidad">
                  ✏️ EDITAR ID
                </Link>
                <button
                  onClick={handleShare}
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all flex items-center gap-2 shadow-lg ${isSharing ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
                >
                  {isSharing ? '✓ COPIADO' : '🔗 COPIAR LINK'}
                </button>
              </div>
            </div>    {/* Roles Premium v3 */}
            {(primaryRole || secondaryRole) && (
              <div className="flex flex-col items-center gap-3 mt-6">
                <div className="flex flex-wrap justify-center gap-3">
                  {primaryRole && (
                    <div className="relative group/role">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur opacity-25 group-hover/role:opacity-50 transition duration-1000"></div>
                      <span className="relative px-5 py-2 rounded-full bg-black/60 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2 shadow-xl">
                        <span className="text-sm">{primaryRole.icon}</span> {primaryRole.title}
                      </span>
                    </div>
                  )}
                  {secondaryRole && (
                    <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                      {secondaryRole.icon || '🛡️'} {secondaryRole.title}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Social Links Hero Display */}
            {profile?.social_links && Array.isArray(profile.social_links) && profile.social_links.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {profile.social_links.map((s, i) => (
                  <a
                    key={i}
                    href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 md:w-11 md:h-11 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-cyan-500/50 transition-all hover:-translate-y-1 group/social shadow-xl"
                    title={s.platform}
                  >
                    <span className="text-base md:text-lg group-hover/social:scale-125 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      {getSocialIcon(s.platform)}
                    </span>
                  </a>
                ))}
              </div>
            ) : isOwnProfile && (
              <div className="mt-4 opacity-20 text-[8px] font-black uppercase tracking-widest">Sin redes sociales vinculadas</div>
            )}

            <p className="text-[12px] font-black text-purple-400 uppercase tracking-[0.4em] mb-4 mt-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10">
              {rankName}
            </p>

            {/* XP Bar Premium */}
            <div className="w-full max-w-sm mt-4 px-4">
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Progreso de Nivel</span>
                  <span className="text-xs font-black italic text-cyan-400 tracking-tighter">{Math.floor(totalXp).toLocaleString()} <span className="text-[9px] opacity-40 not-italic uppercase font-sans">XP Total</span></span>
                </div>
                <span className="text-[10px] font-black text-purple-400 font-mono">META: {Math.floor(nextLevelXp).toLocaleString()}</span>
              </div>
              <div className="profile-v2-xp-bar">
                <div
                  className="profile-v2-xp-fill transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="mt-1.5 text-right">
                <span className="text-[9px] font-black text-white/10 tracking-[0.4em] uppercase">{progressPercent}% completado</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-md pb-12">
              {!isEditingBio ? (
                <div
                  className="group/bio relative w-full cursor-pointer"
                  onClick={() => setIsEditingBio(true)}
                >
                  {/* Glow on hover */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-[3rem] blur-xl opacity-0 group-hover/bio:opacity-100 transition-all duration-700"></div>

                  <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.06] rounded-[2rem] px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                    {/* Decorative corner accents */}
                    <div className="absolute top-3 left-4 text-cyan-500/20 text-3xl font-serif leading-none select-none">"</div>
                    <div className="absolute bottom-1 right-4 text-cyan-500/20 text-3xl font-serif leading-none select-none">"</div>

                    {/* Subtle scan line effect */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }}></div>

                    <p className={`text-sm md:text-base leading-relaxed tracking-wide text-center relative z-10 ${bio ? 'text-gray-300/90 group-hover/bio:text-white/90 transition-colors duration-500' : 'text-white/20 italic'}`}>
                      {bio || 'Toca para escribir tu biografía estelar...'}
                    </p>

                    {/* Edit hint */}
                    <div className="absolute bottom-2 right-8 flex items-center gap-1 opacity-0 group-hover/bio:opacity-60 transition-all duration-300 translate-y-1 group-hover/bio:translate-y-0">
                      <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase">editar</span>
                      <span className="text-cyan-400 text-[10px]">✏️</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full z-20">
                  {/* Glow behind editor */}
                  <div className="absolute -inset-4 bg-cyan-500/5 rounded-[3rem] blur-2xl pointer-events-none"></div>

                  <div className="relative">
                    <textarea
                      autoFocus
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={250}
                      className="w-full bg-[#06060c] border border-cyan-500/30 rounded-2xl p-5 text-sm text-white/90 resize-none h-36 outline-none focus:border-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.08),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all leading-relaxed tracking-wide placeholder:text-white/15 placeholder:italic"
                      placeholder="Escribe tu biografía estelar..."
                    />
                    {/* Character counter */}
                    <div className="absolute bottom-3 right-4 text-[10px] font-mono" style={{ color: bio.length > 220 ? '#f87171' : bio.length > 180 ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>
                      {bio.length}/250
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button className="text-xs px-5 py-2 text-white/40 hover:text-white/80 transition-colors rounded-xl" onClick={() => { setBio(profile?.bio || ''); setIsEditingBio(false); }}>Cancelar</button>
                    <button className="winButton text-xs py-2 px-7 shadow-[0_0_15px_rgba(6,182,212,0.15)]" onClick={async () => {
                      try {
                        await supabase.from('profiles').update({ bio }).eq('id', user.id);
                        setIsEditingBio(false);
                      } catch { }
                    }}>Guardar</button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4 w-full">
                {partnership ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative group/univ">
                      <div className="absolute -inset-6 bg-purple-500/10 blur-3xl rounded-full opacity-0 md:group-hover/univ:opacity-100 transition-opacity"></div>
                      <PrivateUniverse
                        partnership={partnership}
                        onUpdate={async () => {
                          const updated = await universeService.getMyPartnership();
                          setPartnership(updated);
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="text-[9px] font-black tracking-[0.4em] text-purple-400 uppercase animate-pulse">Universo Vinculado</div>
                      <Link
                        to={`/profile/vinculos`}
                        className="text-[10px] font-black text-white/20 hover:text-purple-400 transition-colors uppercase tracking-widest"
                      >
                        Gestionar Vínculo →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link to="/profile/vinculos" className="group relative px-6 py-4 rounded-2xl bg-black/40 border border-white/5 overflow-hidden transition-all hover:border-purple-500/50 shadow-lg flex-1 min-w-[180px]">
                    <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center gap-4">
                      <span className="text-2xl group-hover:rotate-12 transition-transform">✨</span>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/80">Vínculo Estelar</div>
                        <div className="text-[8px] text-white/30 uppercase font-bold">Solicitar conexión</div>
                      </div>
                    </div>
                  </Link>
                )}

                <Link to="/profile/logros" className="group relative px-6 py-4 rounded-2xl bg-black/40 border border-white/5 overflow-hidden transition-all hover:border-cyan-500/50 shadow-lg flex-1 min-w-[180px]">
                  <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex items-center gap-4">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/80">Mis Logros</div>
                      <div className="text-[8px] text-white/30 uppercase font-bold">Ver catálogo completo</div>
                    </div>
                  </div>
                </Link>
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
          <section className="px-6 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_cyan]"></span>
                Métricas del Servidor
              </h2>
              <div className="h-px flex-1 bg-white/5 mx-6"></div>
              <span className="text-[9px] font-mono text-cyan-500/40">v2.5.0-ESTELAR</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title="Seguidores" value={followCounts.followers} icon="👥" highlight="text-purple-400" />
              <StatCard title="Siguiendo" value={followCounts.following} icon="✨" highlight="text-purple-200" />
              <StatCard title="Rank Global" value={topGlobalRank !== 'N/A' ? `#${topGlobalRank}` : '-'} icon="🌍" highlight="text-green-400" />
              <StatCard title="Racha Focus" value={`${cabinStats?.current_streak || 0} 🔥`} icon="⏳" highlight="text-orange-400" />
              <StatCard title="Juegos" value={gameRanks.length} icon="🎮" highlight="text-cyan-400" />
              <StatCard title="Mejor Récord" value={bestRecord.toLocaleString()} icon="🏆" highlight="text-yellow-500" />
            </div>
          </section>

          {/* 3️⃣ TABS */}
          <section className="px-6 md:px-0 flex-1 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-nowrap bg-black/40 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-2 shadow-2xl border border-white/5 overflow-x-auto no-scrollbar gap-1 mb-6">
              <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')}>🏆 Archivos</TabButton>
              <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>🎖️ Medallas</TabButton>
              <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')}>🌌 Identidad</TabButton>
              <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>🛰️ Actividad</TabButton>
              <TabButton active={activeTab === 'wall'} onClick={() => setActiveTab('wall')}>💬 Muro</TabButton>
              <TabButton active={activeTab === 'economy'} onClick={() => setActiveTab('economy')}>💎 Economía</TabButton>
              <TabButton active={activeTab === 'cabina'} onClick={() => setActiveTab('cabina')}>🚀 Sistema</TabButton>
            </div>

            <div className="mt-5 flex-1 mb-8">

              {/* TAB: RECORDS */}
              {activeTab === 'records' && (
                <div className="animate-fade-in-up">
                  {gameRanks.length === 0 ? (
                    <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm">Sin récords registrados. ¡Empieza a jugar en el arcade!</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gameRanks.map(rank => (
                        <div key={rank.game_id} className="group relative bg-black/40 border border-white/5 rounded-[2rem] p-6 hover:border-cyan-500/30 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/10 transition-colors"></div>

                          <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                              🎮
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-black text-cyan-500 font-mono tracking-tighter">SCORE: {(rank.max_score ?? 0).toLocaleString()}</span>
                                <div className="h-2 w-px bg-white/10"></div>
                                <span className="text-[10px] font-black text-purple-400 font-mono">RANK #{rank.user_position}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex gap-1 h-1">
                            <div className="flex-1 bg-cyan-500/40 rounded-full"></div>
                            <div className="flex-1 bg-white/5 rounded-full"></div>
                            <div className="flex-1 bg-white/5 rounded-full"></div>
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
                    <div className="text-center p-24 border border-white/5 rounded-[3rem] bg-black/20 text-white/20 text-xs font-black uppercase tracking-widest">Protocolos de medalla no detectados.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {unlockedAchData.map(ach => (
                        <div key={ach.id} className="group relative p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-purple-500/30 transition-all overflow-hidden flex flex-col items-center text-center">
                          <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-125 group-hover:rotate-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{ach.icon}</div>
                          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">{ach.title}</h4>
                          <p className="text-[10px] text-white/40 leading-relaxed font-medium">{ach.desc}</p>
                          <div className="mt-4 pt-4 border-t border-white/5 w-full">
                            <span className="text-[8px] font-black text-purple-400 uppercase tracking-[0.2em]">Sincronizado ✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: IDENTITY */}
              {activeTab === 'identity' && (
                <div className="animate-fade-in-up">
                  <MoodManager profile={profile} user={user} />
                </div>
              )}

              {/* TAB: ACTIVITY (SOCIAL FEED + BLOG POSTS) */}
              {activeTab === 'activity' && (
                <div className="animate-fade-in-up flex flex-col gap-8 items-center pt-2">

                  {/* Compositor nuevos posts sociales */}
                  <div className="w-full max-w-2xl">
                    <PostComposer onPostCreated={() => {
                      window.dispatchEvent(new CustomEvent('refresh-activity'));
                    }} />
                  </div>

                  {/* Blog posts propios con acciones */}
                  {posts.length > 0 && (
                    <div className="w-full max-w-2xl flex flex-col gap-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">📖 Entradas de Bitácora</h3>
                        <div className="flex items-center gap-3">
                          <Link to="/create-post" className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors">
                            + Nueva
                          </Link>
                          <Link to="/posts" className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors">
                            Feed global →
                          </Link>
                        </div>
                      </div>
                      {posts.map(post => (
                        <div key={post.id} className="relative">
                          <BlogPostCard
                            post={post}
                            authorProfile={profile}
                            onActionComplete={() => { }}
                          />
                          {/* Botón editar del propietario */}
                          <Link
                            to={`/edit-post/${post.id}`}
                            className="absolute top-5 left-6 text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-cyan-400 transition-colors"
                          >
                            editar
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Divisor */}
                  <div className="w-full max-w-2xl flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">🛰️ Transmisiones Sociales</h3>
                    <select
                      value={activityFilter}
                      className="bg-[#0a0a0f] border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 hover:border-white/30 cursor-pointer outline-none"
                      onChange={(e) => setActivityFilter(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      <option value="post">Posts</option>
                      <option value="repost">Reposts</option>
                      <option value="quote">Citas</option>
                    </select>
                  </div>

                  <ActivityFeed userId={user.id} filter={activityFilter} />
                </div>
              )}

              {/* TAB: WALL (MURO) */}
              {activeTab === 'wall' && (
                <div className="animate-fade-in-up flex flex-col gap-10">
                  <div className="bg-black/40 border border-white/5 p-8 rounded-[3rem] shadow-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-6 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                      Nueva Transmisión en Muro
                    </h4>
                    <form onSubmit={handleAddComment} className="space-y-4">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe algo en tu muro público..."
                        className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-sm text-white resize-none min-h-[120px] outline-none focus:border-cyan-500/50 transition-all font-medium"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="px-8 py-3 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                        >
                          {submittingComment ? 'Procesando...' : 'Publicar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {comments.map(c => (
                      <div key={c.id} className="group relative bg-black/20 border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/[0.03] transition-all flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img className="w-10 h-10 rounded-2xl object-cover border border-white/10" src={c.author?.avatar_url || '/default_user_blank.png'} alt="Avatar" />
                            <div>
                              <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{c.author?.username}</span>
                              <span className="block text-[8px] font-black text-white/20 uppercase mt-0.5">{new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteComment(c.id)} className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">✕</button>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed pl-1 font-medium">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center p-24 bg-black/20 rounded-[3rem] border border-white/5 opacity-40">
                        <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Sin transmisiones en el muro</p>
                      </div>
                    )}
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
                <div className="profile-v2-section glass-blue relative overflow-hidden group/cabin">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3 group-hover:bg-cyan-500/10 transition-colors duration-1000"></div>

                  <div className="flex items-center justify-between mb-8 border-b border-cyan-500/10 pb-6">
                    <div>
                      <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.4em] mb-1">Telemetría de Foco</h3>
                      <p className="text-[10px] text-white/20 uppercase font-medium">Análisis de rendimiento en la cabina espacial</p>
                    </div>
                    <div className="text-2xl animate-pulse">🚀</div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2 hover:border-cyan-500/30 transition-all">
                      <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Horas Totales</span>
                      <div className="text-3xl font-black text-white italic">{Math.round((cabinStats?.total_focus_minutes || 0) / 60)}<span className="text-cyan-500 text-lg ml-1">h</span></div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2 hover:border-cyan-500/30 transition-all">
                      <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Sesiones</span>
                      <div className="text-3xl font-black text-white italic">{cabinStats?.total_sessions || 0}</div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2 hover:border-cyan-500/30 transition-all border-orange-500/10">
                      <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Racha</span>
                      <div className="text-3xl font-black text-orange-400 italic">{cabinStats?.current_streak || 0}<span className="text-orange-500/40 text-lg ml-1">d</span></div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2 hover:border-cyan-500/30 transition-all border-cyan-500/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]">
                      <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Ganancias</span>
                      <div className="text-3xl font-black text-cyan-400 italic">◈ {cabinStats?.dancoins_earned || 0}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        </>
      )
      }
    </div >
  );
}

// --- SUBCOMPONENTES REUTILIZABLES ---
function StatCard({ title, value, icon, highlight = 'text-white' }) {
  return (
    <div className="profile-v2-stat-card flex flex-col items-center justify-center text-center group">
      <div className="text-2xl mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">{icon}</div>
      <div className={`text-xl md:text-2xl font-black italic tracking-tighter ${highlight} leading-none`}>{value}</div>
      <div className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black mt-2">{title}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`profile-v2-tab-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}
