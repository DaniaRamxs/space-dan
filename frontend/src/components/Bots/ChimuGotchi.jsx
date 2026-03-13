/**
 * ChimuGotchi Component 🕊️
 * Interfaz para cuidar a tu palomita virtual
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Zap, Smile, Sparkles, Moon, Sun, ShoppingBag, 
  Trophy, Utensils, Bath, Gamepad2, Gift
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const STAT_ICONS = {
  hunger: Utensils,
  happiness: Smile,
  energy: Zap,
  hygiene: Bath,
  health: Heart
};

const STAT_COLORS = {
  hunger: 'text-orange-400',
  happiness: 'text-yellow-400',
  energy: 'text-blue-400',
  hygiene: 'text-cyan-400',
  health: 'text-rose-400'
};

const CHIMU_EMOJIS = {
  HAPPY: '🕊️',
  HUNGRY: '🥺',
  SLEEPY: '😴',
  DIRTY: '🤢',
  SAD: '😢',
  PLAYFUL: '🎾',
  SICK: '🤒',
  DEAD: '💀'
};

export default function ChimuGotchi({ communityId, userId }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status'); // status, shop, leaderboard
  const [shopItems, setShopItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (communityId && userId) {
      loadPet();
      loadShop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, userId]);

  const loadPet = async () => {
    try {
      setLoading(true);
      
      // Get or create pet
      const { data, error } = await supabase
        .from('chimugotchi_pets')
        .select('*')
        .eq('owner_id', userId)
        .eq('community_id', communityId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPet(data);
      } else {
        // Create new pet
        const personalities = ['traviesa', 'cariñosa', 'perezosa', 'energética', 'glotona', 'limpiecita'];
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        
        const { data: newPet, error: createError } = await supabase
          .from('chimugotchi_pets')
          .insert({
            owner_id: userId,
            community_id: communityId,
            name: 'Chimuelo',
            personality,
            hunger: 80,
            happiness: 60,
            energy: 100,
            hygiene: 90,
            health: 100,
            coins: 50
          })
          .select()
          .single();

        if (createError) throw createError;
        setPet(newPet);
        toast.success('¡Adoptaste a tu palomita! 🕊️');
      }
    } catch (err) {
      console.error('[ChimuGotchi] Load error:', err);
      toast.error('Error al cargar tu paloma');
    } finally {
      setLoading(false);
    }
  };

  const loadShop = async () => {
    try {
      const { data, error } = await supabase
        .from('chimugotchi_items')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setShopItems(data || []);
    } catch (err) {
      console.error('[ChimuGotchi] Shop error:', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('chimugotchi_pets')
        .select('*, owner:profiles(username, avatar_url)')
        .eq('community_id', communityId)
        .eq('is_alive', true)
        .order('age', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('[ChimuGotchi] Leaderboard error:', err);
    }
  };

  const handleAction = async (action) => {
    if (!pet || actionLoading || !pet.is_alive) return;
    if (pet.is_sleeping && action !== 'wake') {
      toast.info('💤 Tu paloma está durmiendo');
      return;
    }

    try {
      setActionLoading(true);
      let updates = {};
      let message = '';

      switch (action) {
        case 'feed':
          if (pet.hunger >= 95) {
            toast.info('🍕 Ya está llena');
            return;
          }
          updates = {
            hunger: Math.min(100, pet.hunger + 20),
            happiness: Math.min(100, pet.happiness + 5),
            coins: pet.coins + 1
          };
          message = `🌽 ${pet.name} comió felizmente!`;
          break;

        case 'play':
          if (pet.energy < 20) {
            toast.info('⚡ Está muy cansada para jugar');
            return;
          }
          updates = {
            energy: Math.max(0, pet.energy - 15),
            happiness: Math.min(100, pet.happiness + 20),
            hunger: Math.max(0, pet.hunger - 10),
            coins: pet.coins + 2
          };
          message = `🎾 Jugaste con ${pet.name}!`;
          break;

        case 'pet': {
          updates = {
            happiness: Math.min(100, pet.happiness + 15),
            health: Math.min(100, pet.health + 5)
          };
          const responses = [
            'Cierra los ojitos de felicidad 🥰',
            'Hace "coo-coo-cooo" 💕',
            'Se eriza las plumas de gusto'
          ];
          message = responses[Math.floor(Math.random() * responses.length)];
          break;
        }

        case 'clean':
          if (pet.hygiene >= 90) {
            toast.info('🧼 Ya está limpia');
            return;
          }
          updates = {
            hygiene: 100,
            happiness: Math.min(100, pet.happiness + 5),
            coins: pet.coins + 1
          };
          message = `🛁 Bañaste a ${pet.name}! ✨`;
          break;

        case 'sleep':
          if (pet.is_sleeping) {
            toast.info('😴 Ya está dormida');
            return;
          }
          updates = { is_sleeping: true };
          message = `🌙 ${pet.name} se fue a dormir...`;
          break;

        case 'wake':
          if (!pet.is_sleeping) {
            toast.info('☀️ Ya está despierta');
            return;
          }
          updates = { 
            is_sleeping: false,
            energy: Math.min(100, pet.energy + 30)
          };
          message = `☀️ ${pet.name} despertó! Coo-coo-cooo!`;
          break;

        default:
          return;
      }

      updates.last_interaction = new Date().toISOString();

      const { error } = await supabase
        .from('chimugotchi_pets')
        .update(updates)
        .eq('id', pet.id);

      if (error) throw error;

      setPet({ ...pet, ...updates });
      toast.success(message);
    } catch (err) {
      console.error('[ChimuGotchi] Action error:', err);
      toast.error('Error al interactuar');
    } finally {
      setActionLoading(false);
    }
  };

  const buyItem = async (item) => {
    if (!pet || pet.coins < item.price) {
      toast.error(`💰 Necesitas ${item.price} monedas`);
      return;
    }

    try {
      setActionLoading(true);
      
      const effect = item.effect || {};
      const updates = {
        hunger: Math.min(100, pet.hunger + (effect.hunger || 0)),
        happiness: Math.min(100, pet.happiness + (effect.happiness || 0)),
        energy: Math.min(100, pet.energy + (effect.energy || 0)),
        health: Math.min(100, pet.health + (effect.health || 0)),
        hygiene: Math.min(100, pet.hygiene + (effect.hygiene || 0)),
        coins: pet.coins - item.price,
        inventory: [...(pet.inventory || []), {
          item_id: item.id,
          name: item.name,
          emoji: item.emoji,
          bought_at: new Date().toISOString()
        }],
        last_interaction: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chimugotchi_pets')
        .update(updates)
        .eq('id', pet.id);

      if (error) throw error;

      setPet({ ...pet, ...updates });
      toast.success(`${item.emoji} Compraste ${item.name}!`);
    } catch (err) {
      console.error('[ChimuGotchi] Buy error:', err);
      toast.error('Error al comprar');
    } finally {
      setActionLoading(false);
    }
  };

  const getChimuState = () => {
    if (!pet) return 'HAPPY';
    if (!pet.is_alive) return 'DEAD';
    if (pet.health < 20) return 'SICK';
    if (pet.is_sleeping) return 'SLEEPY';
    if (pet.hygiene < 30) return 'DIRTY';
    if (pet.hunger < 30) return 'HUNGRY';
    if (pet.happiness > 80 && pet.energy > 50) return 'PLAYFUL';
    if (pet.happiness < 30) return 'SAD';
    return 'HAPPY';
  };

  const renderStatBar = (value, type) => {
    const percentage = value;
    const colorClass = percentage > 60 ? 'bg-emerald-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-rose-500';
    const Icon = STAT_ICONS[type];
    const color = STAT_COLORS[type];

    return (
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-8">{percentage}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a24] rounded-xl p-4 animate-pulse">
        <div className="h-8 w-32 bg-white/5 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-full bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  const state = getChimuState();
  const chimuEmoji = CHIMU_EMOJIS[state];

  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {chimuEmoji} ChimuGotchi
          </h3>
          <div className="flex gap-1">
            {['status', 'shop', 'leaderboard'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'leaderboard') loadLeaderboard();
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  activeTab === tab 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'status' ? 'Estado' : tab === 'shop' ? 'Tienda' : 'Top'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'status' && pet && (
          <div className="space-y-4">
            {/* Pet Display */}
            <div className="text-center py-4">
              <motion.div 
                animate={{ 
                  y: state === 'SLEEPY' ? [0, -2, 0] : [0, -5, 0],
                  rotate: state === 'HAPPY' ? [0, 5, -5, 0] : 0
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-2"
              >
                {chimuEmoji}
              </motion.div>
              <h4 className="font-semibold text-white">{pet.name}</h4>
              <p className="text-xs text-gray-500 capitalize">{pet.personality}</p>
              <p className="text-xs text-gray-500">{pet.age.toFixed(1)} días</p>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              {renderStatBar(pet.hunger, 'hunger')}
              {renderStatBar(pet.happiness, 'happiness')}
              {renderStatBar(pet.energy, 'energy')}
              {renderStatBar(pet.hygiene, 'hygiene')}
              {renderStatBar(pet.health, 'health')}
            </div>

            {/* Coins */}
            <div className="flex items-center gap-2 text-yellow-400">
              <Sparkles size={16} />
              <span className="font-semibold">{pet.coins} monedas</span>
            </div>

            {/* Actions */}
            {!pet.is_alive ? (
              <div className="text-center py-4">
                <p className="text-rose-400 mb-2">💀 {pet.name} ha fallecido...</p>
                <button
                  onClick={loadPet}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-cyan-950 font-semibold"
                >
                  Adoptar nueva paloma
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => handleAction('feed')}
                  disabled={actionLoading || pet.hunger >= 95}
                  className="p-2 bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-30 rounded-lg text-orange-400 transition-colors"
                  title="Alimentar"
                >
                  <Utensils size={20} />
                </button>
                <button
                  onClick={() => handleAction('play')}
                  disabled={actionLoading || pet.energy < 20}
                  className="p-2 bg-pink-500/20 hover:bg-pink-500/30 disabled:opacity-30 rounded-lg text-pink-400 transition-colors"
                  title="Jugar"
                >
                  <Gamepad2 size={20} />
                </button>
                <button
                  onClick={() => handleAction('pet')}
                  disabled={actionLoading}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-30 rounded-lg text-rose-400 transition-colors"
                  title="Acariciar"
                >
                  <Heart size={20} />
                </button>
                <button
                  onClick={() => handleAction('clean')}
                  disabled={actionLoading || pet.hygiene >= 90}
                  className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-30 rounded-lg text-cyan-400 transition-colors"
                  title="Limpiar"
                >
                  <Bath size={20} />
                </button>
                <button
                  onClick={() => handleAction(pet.is_sleeping ? 'wake' : 'sleep')}
                  disabled={actionLoading}
                  className="p-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 rounded-lg text-purple-400 transition-colors"
                  title={pet.is_sleeping ? 'Despertar' : 'Dormir'}
                >
                  {pet.is_sleeping ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={() => setActiveTab('shop')}
                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-400 transition-colors"
                  title="Tienda"
                >
                  <ShoppingBag size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Tienda</span>
              <span className="text-xs text-yellow-400">🪙 {pet?.coins || 0}</span>
            </div>
            {shopItems.map(item => (
              <div 
                key={item.id}
                className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                </div>
                <button
                  onClick={() => buyItem(item)}
                  disabled={actionLoading || (pet?.coins || 0) < item.price}
                  className="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-30 rounded text-yellow-400 transition-colors"
                >
                  🪙 {item.price}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Aún no hay palomitas</p>
            ) : (
              leaderboard.map((chimu, i) => (
                <div 
                  key={chimu.id}
                  className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                >
                  <span className="text-lg">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'}
                  </span>
                  <span className="text-xl">
                    {CHIMU_EMOJIS[chimu.happiness > 50 ? 'HAPPY' : 'SAD']}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{chimu.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      de @{chimu.owner?.username}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {chimu.age.toFixed(1)} d
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
