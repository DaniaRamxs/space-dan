import { useState, useEffect, useCallback, useMemo } from 'react';
import { SHOP_ITEMS } from '../hooks/useShopItems';
import useShopItems from '../hooks/useShopItems';
import useDancoins from '../hooks/useDancoins';
import { useEconomy } from '../contexts/EconomyContext';
import { useAuthContext } from '../contexts/AuthContext';
import * as storeService from '../services/store';
import { universeService } from '../services/universe';
import { unlockAchievement } from '../hooks/useAchievements';
import { getNicknameClass, getUserDisplayName } from '../utils/user';
import RadioSvg from '../components/RadioSvg';
import '../styles/NicknameStyles.css';

// Categories that only live in the DB (no localStorage visual effect)
const DB_ONLY_CATEGORIES = new Set(['banner', 'frame', 'pet_accessory', 'nickname_style', 'profile_theme', 'role', 'ambient_sound']);

const CAT_LABELS = {
  theme: '🎨 Perfil Colección',
  cursor: '🖱️ Partículas',
  screensaver: '💤 Screensavers',
  stars: '⭐ Estrellas',
  radio: '📻 Radio',
  banner: '🖼️ Banners',
  frame: '🔲 Marcos',
  pet_accessory: '🐱 Mascota',
  nickname_style: '🧬 Nicknames',
  profile_theme: '🌌 Universe Themes',
  role: '🎖️ Roles',
  ambient_sound: '🎵 Ambientes',
};

// Preferred category order in the tab bar
const CAT_ORDER = ['profile_theme', 'nickname_style', 'role', 'ambient_sound', 'theme', 'cursor', 'screensaver', 'stars', 'radio', 'banner', 'frame', 'pet_accessory'];

export default function ShopPage() {
  const { user } = useAuthContext();
  const { balance, claimDaily, canClaimDaily } = useEconomy();
  const dancoins = useDancoins();   // guest fallback
  const localShop = useShopItems();  // equip + guest purchases

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState(null);
  const [dbItems, setDbItems] = useState([]);      // user_items: {item_id, is_equipped, item}[]
  const [dbCatalog, setDbCatalog] = useState([]);      // store_items from DB
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [partnership, setPartnership] = useState(null);

  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleDescription = (id) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };

  // Load full store catalog from DB (banners, frames, pet accs)
  useEffect(() => {
    if (!user) return;
    setCatalogLoading(true);

    Promise.all([
      storeService.getStoreItems(),
      universeService.getMyPartnership().catch(() => null)
    ]).then(([items, p]) => {
      setDbCatalog(items || []);
      setPartnership(p);
    }).catch(err => console.error('[ShopPage] load error:', err))
      .finally(() => setCatalogLoading(false));
  }, [user?.id]);

  // Load user's inventory from DB
  const reloadDbItems = useCallback(async () => {
    if (!user) return;
    const items = await storeService.getUserItems(user.id);
    setDbItems(items || []);
  }, [user?.id]);

  useEffect(() => {
    reloadDbItems();
  }, [reloadDbItems]);

  // Achievement: rich (500+ coins)
  const currentCoins = user ? balance : dancoins.coins;
  useEffect(() => {
    if (currentCoins >= 500) unlockAchievement('rich');
  }, [currentCoins]);

  const showFlash = (msg, ok) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  // Normalize DB catalog items to same shape as SHOP_ITEMS
  const normalizedDbCatalog = useMemo(() =>
    dbCatalog.map(item => ({
      ...item,
      desc: item.description || '',
    })),
    [dbCatalog]);

  // Full catalog: SHOP_ITEMS + DB items (no duplicates by id)
  const fullCatalog = useMemo(() => {
    if (!user) return SHOP_ITEMS;
    const staticIds = new Set(SHOP_ITEMS.map(i => i.id));
    const extra = normalizedDbCatalog.filter(i => !staticIds.has(i.id));
    return [...SHOP_ITEMS, ...extra];
  }, [user, normalizedDbCatalog]);

  // Dynamic categories derived from fullCatalog
  const categories = useMemo(() => {
    const seen = new Set();
    const list = [{ id: 'all', label: '✦ Todo' }];
    const order = [...CAT_ORDER];
    // Add any unknown categories at the end
    fullCatalog.forEach(i => { if (!order.includes(i.category)) order.push(i.category); });
    order.forEach(cat => {
      if (!seen.has(cat) && fullCatalog.some(i => i.category === cat)) {
        seen.add(cat);
        list.push({ id: cat, label: CAT_LABELS[cat] || cat });
      }
    });
    return list;
  }, [fullCatalog]);

  // Ownership check
  const hasPurchased = useCallback((itemId) => {
    if (user) return dbItems.some(ui => ui.item_id === itemId);
    return localShop.hasPurchased(itemId);
  }, [user, dbItems, localShop]);

  // Equipped check — DB-only categories use dbItems; rest use localStorage
  const isItemEquipped = useCallback((item) => {
    // Para la radio, si está comprada se considera activa/equipada automáticamente
    if (item.category === 'radio') return hasPurchased(item.id);

    const isEquippedLocal = localShop.getEquipped(item.category) === item.id;
    const isEquippedDb = user && dbItems.some(ui => ui.item_id === item.id && ui.is_equipped);
    return isEquippedLocal || isEquippedDb;
  }, [dbItems, localShop, user, hasPurchased]);

  const handleBuy = async (item) => {
    const owned = hasPurchased(item.id);

    if (owned) {
      if (item.category === 'radio') {
        showFlash(`Esta estación ya está disponible en tu Radio Player 📻`, true);
        return;
      }
      localShop.equip(item.category, item.id);
      if (user) {
        try {
          await storeService.equipItem(user.id, item.id);
          await reloadDbItems();
        } catch (err) {
          console.error('[ShopPage] Error equipping:', err);
          showFlash('Error al sincronizar con el servidor', false);
        }
      }
      showFlash(`¡${item.title} equipado!`, true);
      return;
    }

    if (user) {
      try {
        await storeService.purchaseItem(user.id, item.id);
        await reloadDbItems();
        localShop.equip(item.category, item.id);
        await storeService.equipItem(user.id, item.id).catch(() => { });
        await reloadDbItems();
        showFlash(`¡${item.title} comprado y equipado!`, true);
        unlockAchievement('shopper');
      } catch (err) {
        const msg = /insufficient/i.test(err.message) ? 'Dancoins insuficientes'
          : /already/i.test(err.message) ? 'Ya tienes este item'
            : err.message || 'Error al comprar';
        showFlash(msg, false);
      }
    } else {
      // Intento de compra para visitantes (solo para items locales)
      const isLocalItem = SHOP_ITEMS.some(i => i.id === item.id);
      if (isLocalItem) {
        const result = localShop.purchaseItem ? localShop.purchaseItem(item.id) : false;
        if (result) {
          localShop.equip(item.category, item.id);
          showFlash(`¡${item.title} comprado y equipado!`, true);
        } else {
          showFlash('Dancoins insuficientes o item ya obtenido', false);
        }
      } else {
        showFlash('Debes registrarte para comprar este tipo de items.', false);
      }
    }
  };

  const handleUnequip = async (item) => {
    const isDbOnly = DB_ONLY_CATEGORIES.has(item.category);
    if (!isDbOnly) localShop.unequip(item.category);
    if (user) {
      await storeService.unequipItem(user.id, item.id).catch(console.error);
      await reloadDbItems();
    }
    showFlash(`${item.title} desequipado`, true);
  };

  const handleDaily = async () => {
    if (user) {
      try {
        const result = await claimDaily();
        showFlash(
          result?.success
            ? `¡+${result.amount ?? 30} Dancoins! Bonus diario reclamado`
            : (result?.message || 'Ya reclamaste el bonus de hoy'),
          !!result?.success
        );
      } catch (err) {
        showFlash(err.message || 'Ya reclamaste el bonus de hoy', false);
      }
    } else {
      const claimed = dancoins.claimDailyBonus();
      showFlash(claimed ? '¡+30 Dancoins! Bonus diario reclamado' : 'Ya reclamaste el bonus de hoy', claimed);
    }
  };

  const canClaimDailyNow = user ? canClaimDaily() : dancoins.canClaimDaily();

  const filteredBySearch = useMemo(() => {
    let result = fullCatalog;
    if (activeCategory !== 'all') {
      result = result.filter(i => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [fullCatalog, activeCategory, searchQuery]);

  const featuredItems = useMemo(() => {
    return fullCatalog
      .filter(i => (i.rarity === 'legendary' || i.rarity === 'epic') && !hasPurchased(i.id))
      .slice(0, 3);
  }, [fullCatalog, hasPurchased]);

  const equippedSummary = fullCatalog.filter(item => isItemEquipped(item));

  return (
    <div className="shopPage max-w-7xl mx-auto px-6 sm:px-4 py-8 space-y-8 sm:space-y-12 overflow-x-hidden">
      {/* Hero Section with Animated Background */}
      <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-black border border-white/10 p-6 sm:p-8 md:p-12 min-h-[280px] sm:min-h-[320px] flex flex-col justify-center group/hero">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 opacity-70"></div>
        <div className="absolute inset-0 shop-hero-mesh opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.png')] opacity-10 pointer-events-none"></div>

        {/* Animated Particles/Stars (Simplified) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="stars-float absolute inset-0 opacity-40"></div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold text-pink-400 border border-white/5 mb-6 animate-pulse">
            SISTEMA DE COMERCIO ACTIVO
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-4 sm:mb-6 leading-none">
            TIENDA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">UNIVERSE.exe</span>
          </h1>

          <div className="flex flex-wrap items-center gap-6">
            <div className="px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 group/wallet transition-all hover:bg-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.5)]">◈</div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-40 font-bold leading-tight">Tu Balance</div>
                <div className="text-2xl font-black font-mono tracking-tight text-white">{currentCoins}</div>
              </div>
            </div>

            {canClaimDailyNow && (
              <button
                className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black font-black text-[11px] sm:text-sm rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden group/daily"
                onClick={handleDaily}
              >
                <span className="relative z-10">RECLAMAR BONUS DIARIO</span>
                <span className="relative z-10 text-lg sm:text-xl text-yellow-500">✨</span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 translate-y-full group-hover/daily:translate-y-0 transition-transform duration-300"></div>
              </button>
            )}
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute right-12 bottom-12 hidden lg:flex flex-col items-end gap-2 opacity-20 group-hover/hero:opacity-40 transition-opacity">
          <div className="text-8xl font-black italic leading-none">DAN</div>
          <div className="text-4xl font-light tracking-[0.5em] leading-none">CORP</div>
        </div>
      </div>

      {flash && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-300 ${flash.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {flash.msg}
        </div>
      )}

      {equippedSummary.length > 0 && (
        <div className="relative p-6 rounded-[2rem] bg-pink-500/5 border border-pink-500/20 backdrop-blur-sm overflow-hidden group/equipped">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-pink-500/20 blur-[50px] rounded-full group-hover/equipped:scale-150 transition-transform duration-1000"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400/80">Equipamiento Actual</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {equippedSummary.map(item => (
                <div key={item.id} className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 pr-2 sm:pr-3 py-1 sm:py-1.5 bg-black/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/5 group/eitem transition-all hover:border-pink-500/30">
                  <span className="text-base sm:text-lg">{item.icon}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-white/80">{item.title}</span>
                  <button
                    className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-red-500 hover:text-white transition-all text-[7px] sm:text-[8px]"
                    title="Desequipar"
                    onClick={() => handleUnequip(item)}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="shopHint">
        <div>Gana ◈ visitando páginas, jugando juegos nuevos, desbloqueando logros y reclamando el bonus diario.</div>
        {!user && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl animate-pulse">
            <span className="text-yellow-400 font-black flex items-center gap-2 justify-center">
              ⚠️ ATENCIÓN: Debes iniciar sesión para comprar items permanentes, banners y marcos.
            </span>
          </div>
        )}
        <div className="shopHintCategories">
          <span>🎨 Perfil Colección — cambia los colores de botones, bordes y UI</span>
          <span>🌌 Universe Themes — cambia el fondo y la dimensión de tu espacio</span>
          <span>🖱️ Partículas — trail que sigue a tu ratón</span>
          <span>💤 Screensavers — animación tras inactividad</span>
          <span>🖼️ Banners — fondo de tu perfil</span>
          <span>🔲 Marcos — borde de tu avatar</span>
          <span>🐱 Mascota — accesorios para el gato</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
        {/* Advanced Filters */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 pb-4">
            {categories.map(c => (
              <button
                key={c.id}
                className={`px-5 py-2.5 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all whitespace-nowrap border-2 ${activeCategory === c.id
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar - Cinematic Style */}
        <div className="relative w-full lg:min-w-[300px] lg:w-auto group/search">
          <input
            type="text"
            placeholder="Buscar en el catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border-2 border-white/10 rounded-2xl px-12 py-3.5 text-sm transition-all focus:bg-white/5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none placeholder:text-white/20"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-cyan-500 transition-colors pointer-events-none">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
            >✕</button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="text-xs uppercase font-bold tracking-[0.2em] text-cyan-400/60 pb-4">
          Resultados para "{searchQuery}" — {filteredBySearch.length} encontradxs
        </div>
      )}

      {!searchQuery && featuredItems.length > 0 && activeCategory === 'all' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white/40">Destacados de la Temporada</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredItems.map(item => {
              const owned = hasPurchased(item.id);
              const equipped = isItemEquipped(item);
              const canAfford = currentCoins >= item.price;
              const cardRarityClass = `rarity-${item.rarity || 'common'}`;
              return (
                <div key={`feat-${item.id}`} className="group relative rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent p-[1.5px] overflow-hidden hover:scale-[1.02] transition-all duration-500">
                  <div className={`absolute inset-0 opacity-20 ${cardRarityClass}`}></div>
                  <div className="relative z-10 bg-[#080810] rounded-[calc(2rem-1.5px)] p-5 sm:p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-4xl">{item.icon}</div>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-white uppercase">{item.rarity}</span>
                    </div>
                    <h3 className="text-xl font-black italic mb-2 tracking-tighter">{item.title}</h3>
                    <p className={`text-xs text-white/40 mb-2 ${expandedItems.has(item.id) ? '' : 'line-clamp-2'}`}>
                      {item.desc || item.description}
                    </p>
                    {(item.desc || item.description)?.length > 80 && (
                      <button
                        onClick={() => toggleDescription(item.id)}
                        className="text-cyan-400 text-[10px] font-bold mb-4 hover:underline text-left"
                      >
                        {expandedItems.has(item.id) ? 'VER MENOS ↑' : 'VER MÁS ↓'}
                      </button>
                    )}
                    <div className="mt-auto">
                      <button
                        className={`w-full py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all ${canAfford || owned ? 'bg-white text-black hover:shadow-[0_0_20px_white]' : 'bg-white/5 text-white/20'}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford && !owned}
                      >
                        {equipped ? '✓ ACTIVO' : owned ? 'EQUIPAR' : user ? `COMPRAR POR ◈ ${item.price}` : 'REGÍSTRATE'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {catalogLoading && (
        <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6, fontSize: '0.9rem' }}>
          cargando_tienda...
        </div>
      )}

      {filteredBySearch.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="text-6xl opacity-20">📡</div>
          <div className="space-y-1">
            <h3 className="text-xl font-black italic text-white/40">SIN RESULTADOS</h3>
            <p className="text-sm text-white/20">No hemos encontrado nada que coincida con tu búsqueda.</p>
          </div>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
          >Limpiar filtros</button>
        </div>
      )}

      <div className="shopGrid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
        {filteredBySearch.map(item => {
          const owned = hasPurchased(item.id);
          const equipped = isItemEquipped(item);
          const canAfford = currentCoins >= item.price;
          const isLevelLocked = (() => {
            if (!item.partnership_only || !partnership) return false;
            const frameLevelMatch = item.id.match(/lv(\d+)/);
            const itemLevel = frameLevelMatch ? parseInt(frameLevelMatch[1], 10) : 0;
            const userLevel = partnership.evolution_level || 1;
            return itemLevel > userLevel;
          })();

          const cardRarityClass = `rarity-${item.rarity || 'common'}`;

          return (
            <div
              key={item.id}
              className={`group shopCard-v2 relative flex flex-col bg-white/[0.03] border border-white/10 rounded-3xl p-4 sm:p-5 transition-all hover:bg-white/[0.07] hover:-translate-y-1 ${owned ? 'owned' : ''} ${equipped ? 'equipped border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.15)]' : ''} ${item.partnership_only && (!partnership || isLevelLocked) ? 'opacity-40 grayscale-50' : ''}`}
            >
              {/* Rarity Glow */}
              <div className={`absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity blur-md z-0 ${cardRarityClass}`}></div>

              {/* Partnership Lock Overlay */}
              {item.partnership_only && (
                (!partnership) ? (
                  <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-3xl mb-2">🔒</span>
                    <div className="font-bold text-xs uppercase tracking-widest text-pink-400 mb-1">Vínculo Requerido</div>
                    <p className="text-[9px] opacity-60">Solo para parejas del Universo</p>
                  </div>
                ) : (
                  (() => {
                    const frameLevelMatch = item.id.match(/lv(\d+)/);
                    const itemLevel = frameLevelMatch ? parseInt(frameLevelMatch[1], 10) : 0;
                    const userLevel = partnership.evolution_level || 1;

                    if (itemLevel > userLevel) {
                      return (
                        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                          <span className="text-3xl mb-2">⚡</span>
                          <div className="font-bold text-xs uppercase tracking-widest text-purple-400 mb-1">NVL {itemLevel} +</div>
                          <p className="text-[9px] opacity-60">Tu Vínculo: Nivel {userLevel}</p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )
              )}

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 relative ${item.category === 'nickname_style' ? 'w-full min-h-[80px]' : 'min-w-[64px] min-h-[64px]'}`}>
                    {item.category === 'nickname_style' ? (
                      <div className="flex flex-col items-center justify-center w-full p-2 overflow-visible bg-white/5 rounded-xl border border-white/5">
                        <span className={`text-base whitespace-nowrap ${getNicknameClass({ nicknameStyle: item.id })}`}>
                          {user ? getUserDisplayName(user) : 'Explorador'}
                        </span>
                      </div>
                    ) : item.category === 'role' ? (
                      <div className="flex flex-col items-center justify-center w-full py-6 relative">
                        {/* Halo etéreo de fondo para dar profundidad sin usar cajas */}
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 blur-2xl rounded-full scale-150 opacity-40"></div>

                        <div className="relative z-10">
                          {/* El badge real flotando */}
                          <div className="relative group/role-preview">
                            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/40 to-purple-500/40 rounded-full blur-md opacity-0 group-hover/role-preview:opacity-100 transition-opacity duration-500"></div>
                            <span className="relative px-6 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-3 shadow-[0_0_30px_rgba(0,229,255,0.2)] hover:scale-110 transition-transform duration-500">
                              <span className="text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{item.icon}</span>
                              {item.title}
                            </span>
                          </div>
                        </div>

                        {/* Indicador minimalista inferior */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      </div>
                    ) : item.category === 'theme' || item.category === 'cursor' ? (
                      <div className="flex flex-col items-center justify-center w-full min-h-[80px] bg-black/40 rounded-xl border border-white/5 relative overflow-hidden p-3">
                        <div className="w-full h-8 rounded-lg flex gap-1 mb-2 overflow-hidden border border-white/10 relative">
                          {(item.swatch || ['#333', '#111']).map((color, i) => (
                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }}></div>
                          ))}
                          {item.category === 'cursor' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] animate-ping"></div>
                            </div>
                          )}
                        </div>
                        <div className="w-full flex items-center gap-2">
                          <div className="h-1 flex-1 bg-white/20 rounded"></div>
                          <div className={`text-[7px] font-black uppercase text-white/40`}>
                            {item.category === 'cursor' ? 'Trail FX' : 'Muestra UI'}
                          </div>
                        </div>
                      </div>
                    ) : item.category === 'profile_theme' ? (
                      <div className="flex flex-col items-center justify-center w-full min-h-[100px] bg-black/40 rounded-xl border border-white/5 relative overflow-hidden group/universe-preview">
                        {/* Simulación miniatura del Universe Home */}
                        <div className="absolute inset-0 opacity-40 transition-transform duration-700 group-hover/universe-preview:scale-110"
                          style={{
                            background: item.metadata?.gradient ? `linear-gradient(to bottom, ${item.metadata.gradient.join(', ')})` : 'var(--bg-dark)',
                            backgroundSize: 'cover'
                          }}>
                          {item.metadata?.fx === 'nebula' && <div className="absolute inset-0 animate-pulse bg-purple-500/10 blur-xl"></div>}
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center p-2">
                          <span className="text-2xl mb-1 drop-shadow-md">{item.icon}</span>
                          <div className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10 text-[7px] font-black text-white/60">ESTILO COSMOS</div>
                        </div>
                      </div>
                    ) : item.category === 'stars' ? (
                      <div className="flex flex-col items-center justify-center w-full min-h-[80px] bg-black/40 rounded-xl border border-white/5 relative overflow-hidden p-3">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/5 opacity-20"></div>
                        <div className="relative flex gap-2">
                          <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentcolor]" style={{ backgroundColor: item.swatch?.[0] || '#fff', color: item.swatch?.[0] || '#fff' }}></div>
                          <div className="w-1.5 h-1.5 rounded-full animate-bounce shadow-[0_0_10px_currentcolor]" style={{ backgroundColor: item.swatch?.[1] || '#fff', color: item.swatch?.[1] || '#fff', animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-1 rounded-full animate-pulse shadow-[0_0_10px_currentcolor]" style={{ backgroundColor: item.swatch?.[0] || '#fff', color: item.swatch?.[0] || '#fff', animationDelay: '0.5s' }}></div>
                        </div>
                        <span className="mt-3 text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Atmósfera Estelar</span>
                      </div>
                    ) : item.category === 'banner' ? (
                      <div className="flex flex-col items-center justify-center w-full min-h-[90px] bg-black/40 rounded-xl border border-white/5 relative overflow-hidden group/banner-preview">
                        <div className="absolute inset-0 opacity-80"
                          style={{
                            background: item.metadata?.gradient ? `linear-gradient(to right, ${item.metadata.gradient.join(', ')})` : 'var(--bg-dark)',
                            backgroundSize: '200% 200%',
                          }}>
                          {item.metadata?.fx === 'matrix' && <div className="absolute inset-0 banner-fx-matrix opacity-70"></div>}
                          {item.metadata?.fx === 'scanlines' && <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>}
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center p-4">
                          <div className="px-3 py-1 rounded bg-black/40 backdrop-blur-md border border-white/20 text-[8px] font-black text-white/80 uppercase tracking-widest">Vista Previa Banner</div>
                        </div>
                      </div>
                    ) : item.preview_url ? (
                      <img
                        src={item.preview_url}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded-lg pixelated transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <span className="text-3xl group-hover:scale-110 transition-transform">
                        {typeof item.icon === 'string' && item.icon.startsWith('svg:') ? (
                          <div className="w-10 h-10 text-white/80">
                            <RadioSvg type={item.icon.split(':')[1]} />
                          </div>
                        ) : (
                          item.icon
                        )}
                      </span>
                    )}

                    {/* Category Overlay Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-black/80 border border-white/10 rounded-lg p-1 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {CAT_LABELS[item.category]?.split(' ')[0] || '✦'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {item.rarity && item.rarity !== 'common' && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border border-current opacity-70 ${item.rarity === 'legendary' ? 'text-yellow-400' :
                        item.rarity === 'epic' ? 'text-purple-400' :
                          'text-cyan-400'
                        }`}>
                        {item.rarity}
                      </span>
                    )}
                    <span className="text-[7px] uppercase tracking-widest text-white/20 font-black">{item.category}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-black text-sm tracking-tight text-white/90 mb-1 group-hover:text-pink-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className={`text-[11px] text-white/50 leading-relaxed ${expandedItems.has(item.id) ? 'mb-2' : 'line-clamp-2 mb-1'}`}>
                    {item.desc || item.description || "Sin descripción disponible."}
                  </p>
                  {(item.desc || item.description)?.length > 50 && (
                    <button
                      onClick={() => toggleDescription(item.id)}
                      className="text-cyan-400 text-[9px] font-black uppercase tracking-widest hover:underline mb-3"
                    >
                      {expandedItems.has(item.id) ? 'Ver menos ↑' : 'Ver más ↓'}
                    </button>
                  )}
                </div>
                <div className="shopCardFooter">
                  <div className="mt-4">
                    {equipped ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] text-pink-500 font-black uppercase tracking-widest bg-pink-500/10 w-full py-1 text-center rounded-lg">✓ Activo</span>
                        <button
                          className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest underline"
                          onClick={() => handleUnequip(item)}
                        >Desequipar</button>
                      </div>
                    ) : owned ? (
                      <button
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${isLevelLocked ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-cyan-500 text-black hover:bg-cyan-400 active:scale-95'}`}
                        onClick={() => handleBuy(item)}
                        disabled={isLevelLocked}
                      >
                        EQUIPAR
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${canAfford ? 'bg-pink-500 text-white hover:bg-pink-400 shadow-[0_4px_12_rgba(236,72,153,0.3)] active:scale-95' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford}
                        >
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                            {user ? `◈ ${item.price}` : 'REGÍSTRATE'}
                          </span>
                        </button>
                        {!canAfford && (
                          <p className="text-[9px] text-red-500/80 text-center font-bold">Te faltan {item.price - currentCoins} coins</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!user && (
        <div className="text-center py-12 opacity-50 text-xs italic">
          Inicia sesión para acceder a banners, marcos y accesorios para tu mascota.
        </div>
      )}
    </div>
  );
}
