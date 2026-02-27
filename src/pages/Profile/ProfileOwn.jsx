import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import ActivityFeed from '../../components/Social/ActivityFeed';
import PostComposer from '../../components/Social/PostComposer';
import { activityService } from '../../services/activityService';
import BlogPostCard from '../../components/Social/BlogPostCard';
import { supabase } from '../../supabaseClient';
import { ACHIEVEMENTS } from '../../hooks/useAchievements';
import { getUserGameRanks } from '../../services/supabaseScores';
import { getTransactionHistory, getActiveFund, getFundTopDonors, donateToFund, transferCoins } from '../../services/economy';
import { getProductivityStats } from '../../services/productivity';
import * as storeService from '../../services/store';
import { blogService } from '../../services/blogService';
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
    <section className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-white opacity-90">Economía Personal</h2>
        <p className="text-micro opacity-40">Gestión de Dancoins y recursos digitales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-40">
          <span className="text-micro opacity-40">Saldo Disponible</span>
          <div className="text-4xl font-black text-white font-mono tracking-tighter">
            <span className="text-pink-500/50 mr-2 opacity-50">◈</span>
            {balance.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {canClaimDaily() ? (
            <button
              className="w-full h-full py-8 bg-white/90 text-black font-black text-xs rounded-3xl shadow-lg hover:bg-white transition-all flex items-center justify-center gap-3"
              onClick={handleDaily}
            >
              <span className="uppercase tracking-widest">Reclamar Bonus</span>
              <span>🎁</span>
            </button>
          ) : (
            <div className="w-full h-full p-8 border border-white/5 rounded-3xl text-micro flex items-center justify-center text-center">
              Siguiente bonus disponible en 24h
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
  const { balance } = useEconomy();
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
  const totalXp = Math.floor(Math.max(0, (balance || 0) + (unlockedAchData.length * 150) + (gameRanks.length * 200) + ((cabinStats?.total_focus_minutes || 0) * 2)));
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
    <div className="min-h-screen bg-[#040408] text-white font-sans relative">
      <div className="fixed inset-0 bg-[url('/grid-pattern.png')] opacity-[0.02] pointer-events-none" />

      {/* Banner Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className={`h-64 md:h-80 w-full relative overflow-hidden bg-[#06060c] border-b border-white/5 transition-all duration-1000 ${bannerItem?.metadata?.animated ? 'animate-aurora' : ''}`}
        style={{
          backgroundImage: [
            bannerItem?.preview_url ? `url(${bannerItem.preview_url})` : null,
            bannerItem?.metadata?.gradient
              ? `linear-gradient(to right, ${bannerItem.metadata.gradient.join(', ')})`
              : (bannerItem?.metadata?.hex
                ? `radial-gradient(circle at top right, ${bannerItem.metadata.hex}66 0%, transparent 70%)`
                : (profile?.banner_color
                  ? `radial-gradient(circle at top right, ${profile.banner_color}66 0%, transparent 60%)`
                  : 'radial-gradient(circle at top right, rgba(139,92,246,0.1) 0%, transparent 60%)'
                )
              )
          ].filter(Boolean).join(', '),
          backgroundSize: bannerItem?.preview_url ? 'cover, auto' : 'auto',
          backgroundPosition: bannerItem?.preview_url ? 'center, center' : 'center',
        }}
      >
        {/* Effects Layers */}
        {bannerItem?.metadata?.fx === 'matrix' && <div className="absolute inset-0 banner-fx-matrix opacity-60 z-10"></div>}
        {bannerItem?.metadata?.fx === 'scanlines' && <div className="absolute inset-0 banner-fx-scanlines opacity-20"></div>}
        {bannerItem?.metadata?.fx === 'stars' && <div className="absolute inset-0 banner-fx-stars opacity-40"></div>}
        {bannerItem?.metadata?.fx === 'void' && <div className="absolute inset-0 banner-fx-void opacity-50"></div>}

        {/* Global Bottom Fade for better transition to content */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040408]/20 to-[#040408]" />

        {/* Dynamic Mesh Overlays */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-[0.03] pointer-events-none" />
      </motion.div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 md:-mt-20 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-12 space-y-12">
            <div className="space-y-8">
              <div className="relative w-40 h-40">
                <AvatarUploader
                  currentAvatar={profile?.avatar_url}
                  frameStyle={getFrameStyle(frameItemId || profile?.frame_item_id)}
                  isLv5={(frameItemId || profile?.frame_item_id) === 'frame_link_lv5'}
                  onUploadSuccess={() => { }}
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl z-50">
                  LVL {level}
                </div>
              </div>

              <div className="space-y-4">
                <h1 className={`text-display font-black tracking-tight leading-none ${getNicknameClass(profile)} text-white uppercase`}>
                  {getUserDisplayName(profile || { username: user?.user_metadata?.full_name || (user?.email || '').split('@')[0] })}
                </h1>
                {profile?.pronouns && (
                  <span className="text-micro opacity-40 block uppercase tracking-widest">{profile.pronouns}</span>
                )}

                {/* Roles Display */}
                {(primaryRole || secondaryRole) && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {primaryRole && (
                      <div className="relative group/role">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/50 to-cyan-500/50 rounded-full blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <span className="relative px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5 shadow-lg">
                          <span>{primaryRole.icon || '🛡️'}</span> {primaryRole.title}
                        </span>
                      </div>
                    )}
                    {secondaryRole && (
                      <span className="px-3 py-1 rounded-full bg-white/[0.02] border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                        {secondaryRole.icon || '🛡️'} {secondaryRole.title}
                      </span>
                    )}
                  </div>
                )}
                {!isEditingBio ? (
                  <p className="text-sm text-white/50 leading-relaxed cursor-pointer hover:text-white/80 transition-colors" onClick={() => setIsEditingBio(true)}>
                    {bio || 'Añade una biografía para personalizar tu refugio...'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <textarea autoFocus value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm text-white h-32 resize-none outline-none" />
                    <div className="flex justify-end gap-2">
                      <button className="text-micro opacity-40" onClick={() => setIsEditingBio(false)}>Cancelar</button>
                      <button className="text-micro font-bold bg-white/10 px-4 py-1 rounded-lg" onClick={async () => {
                        await supabase.from('profiles').update({ bio }).eq('id', user.id);
                        setIsEditingBio(false);
                      }}>Guardar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Vínculo Estelar */}
              {partnership && (
                <div className="pt-8 border-t border-white/5">
                  <PrivateUniverse partnership={partnership} />
                  <div className="mt-2 text-[9px] font-black tracking-[0.3em] text-purple-400/40 uppercase text-center">Universo Vinculado</div>
                </div>
              )}

              <div className="space-y-6 pt-12 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-micro opacity-40 uppercase tracking-widest">Dancoins</span>
                  <span className="text-xl font-bold font-mono tracking-tighter">◈ {balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-micro opacity-40 uppercase tracking-widest">Racha Social</span>
                  <span className="text-xl font-bold font-mono text-white tracking-tighter">{profile?.streak || 0}D</span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[9px] font-mono opacity-20 uppercase tracking-widest">
                    <span>Progreso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-white/80"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to="/onboarding" className="text-micro px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 transition-all uppercase tracking-widest">Configurar ID</Link>
                <button onClick={handleShare} className="text-micro px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 transition-all uppercase tracking-widest">{isSharing ? 'Copiado' : 'Compartir Link'}</button>
              </div>

            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-8 space-y-12">
            <nav className="flex gap-8 border-b border-white/5 overflow-x-auto no-scrollbar">
              <TabButton
                active={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
                onMouseEnter={() => activityService.prefetchFeed(user.id, activityFilter)}
              >
                Actividad
              </TabButton>
              <TabButton
                active={activeTab === 'records'}
                onClick={() => setActiveTab('records')}
                onMouseEnter={() => { /* Opción de prefetch para records si existiese */ }}
              >
                Registros
              </TabButton>
              <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>Logros</TabButton>
              <TabButton active={activeTab === 'wall'} onClick={() => setActiveTab('wall')}>Muro</TabButton>
              <TabButton active={activeTab === 'economy'} onClick={() => setActiveTab('economy')}>Cartera</TabButton>
              <TabButton active={activeTab === 'cabina'} onClick={() => setActiveTab('cabina')}>Cabina</TabButton>
            </nav>

            <div className="w-full max-w-2xl mx-auto min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-12"
                >
                  {activeTab === 'activity' && (
                    <div className="space-y-12">
                      <PostComposer onPostCreated={(newPost) => window.dispatchEvent(new CustomEvent('activity:new-post', { detail: newPost }))} />
                      <ActivityFeed userId={user.id} filter={activityFilter} />
                    </div>
                  )}

                  {activeTab === 'records' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameRanks.length === 0 ? (
                        <div className="col-span-2 py-20 text-center text-micro opacity-20 uppercase tracking-widest">Sin archivos detectados</div>
                      ) : (
                        gameRanks.map(rank => (
                          <div key={rank.game_id} className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4 hover:bg-white/[0.02] transition-all">
                            <div className="flex justify-between items-start">
                              <h3 className="text-micro opacity-40 uppercase tracking-widest">{GAME_NAMES[rank.game_id] || rank.game_id}</h3>
                              <span className="text-[9px] font-mono opacity-20">RANK #{rank.user_position}</span>
                            </div>
                            <div className="text-3xl font-bold font-mono tracking-tighter">{(rank.max_score ?? 0).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'achievements' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {unlockedAchData.length === 0 ? (
                        <div className="col-span-4 py-20 text-center text-micro opacity-20 uppercase tracking-widest">Medallas no sincronizadas</div>
                      ) : (
                        unlockedAchData.map(ach => (
                          <div key={ach.id} className="aspect-square flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.01] border border-white/5 text-center group transition-all hover:bg-white/[0.02]">
                            <span className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500 opacity-40 group-hover:opacity-100">{ach.icon}</span>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{ach.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'wall' && (
                    <div className="space-y-12">
                      <div className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 space-y-6">
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe en el muro de este refugio..." className="w-full bg-transparent border-none text-sm outline-none h-24 text-white opacity-80" />
                        <div className="flex justify-end">
                          <button onClick={handleAddComment} className="text-micro font-black px-6 py-2 bg-white text-black rounded-xl hover:bg-white/90 transition-all uppercase tracking-widest">Publicar Mensaje</button>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {comments.map(c => (
                          <div key={c.id} className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 flex gap-6 hover:bg-white/[0.02] transition-colors">
                            <img src={c.author?.avatar_url || '/default_user_blank.png'} className="w-12 h-12 rounded-2xl object-cover opacity-60" />
                            <div className="space-y-1">
                              <div className="text-micro font-black uppercase tracking-widest opacity-40">{c.author?.username}</div>
                              <p className="text-sm text-white/50 leading-relaxed">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {comments.length === 0 && (
                          <div className="py-20 text-center text-micro opacity-20 uppercase tracking-widest">El muro está vacío</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'economy' && (
                    <div className="space-y-12">
                      <EconomySection user={user} />
                      <FundSection user={user} />
                    </div>
                  )}

                  {activeTab === 'cabina' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StatCard title="Horas Totales de Foco" value={`${Math.round((cabinStats?.total_focus_minutes || 0) / 60)}h`} />
                      <StatCard title="Sesiones Iniciadas" value={cabinStats?.total_sessions || 0} />
                      <StatCard title="Racha en Cabina" value={`${cabinStats?.current_streak || 0}D`} />
                      <StatCard title="Dancoins Ganadas" value={`◈ ${cabinStats?.dancoins_earned || 0}`} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES REUTILIZABLES CON MICROINTERACCIONES ---

function StatCard({ title, value, icon, highlight = 'text-white' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.03)" }}
      className="flex flex-col items-start p-8 rounded-3xl bg-white/[0.01] border border-white/5 transition-all group/stat"
    >
      <span className="text-micro opacity-40 uppercase tracking-widest font-mono mb-4 group-hover/stat:opacity-60 transition-opacity">{title}</span>
      <div className={`text-display font-bold font-mono tracking-tighter ${highlight} tabular-nums`}>
        {value}
      </div>
      {icon && <div className="text-xl mt-6 opacity-20 group-hover/stat:opacity-40 transition-opacity">{icon}</div>}
    </motion.div>
  );
}

function TabButton({ active, onClick, onMouseEnter, children }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`relative py-4 text-heading font-black uppercase tracking-widest transition-all duration-300 ${active ? 'text-white' : 'text-white/20 hover:text-white/60'}`}
    >
      <span className="relative z-10">{children}</span>
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
        />
      )}
    </button>
  );
}
