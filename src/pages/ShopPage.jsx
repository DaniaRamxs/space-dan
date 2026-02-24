import { useState, useEffect, useCallback, useMemo } from 'react';
import { SHOP_ITEMS, purchaseItem as localPurchase } from '../hooks/useShopItems';
import useShopItems from '../hooks/useShopItems';
import useDancoins from '../hooks/useDancoins';
import { useEconomy } from '../contexts/EconomyContext';
import { useAuthContext } from '../contexts/AuthContext';
import * as storeService from '../services/store';
import { universeService } from '../services/universe';
import { unlockAchievement } from '../hooks/useAchievements';

// Categories that only live in the DB (no localStorage visual effect)
const DB_ONLY_CATEGORIES = new Set(['banner', 'frame', 'pet_accessory']);

const CAT_LABELS = {
  theme: '🎨 Temas',
  cursor: '🖱️ Cursores',
  screensaver: '💤 Screensavers',
  stars: '⭐ Estrellas',
  radio: '📻 Radio',
  banner: '🖼️ Banners',
  frame: '🔲 Marcos',
  pet_accessory: '🐱 Mascota',
};

// Preferred category order in the tab bar
const CAT_ORDER = ['theme', 'cursor', 'screensaver', 'stars', 'radio', 'banner', 'frame', 'pet_accessory'];

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
    if (DB_ONLY_CATEGORIES.has(item.category)) {
      return dbItems.some(ui => ui.item_id === item.id && ui.is_equipped);
    }
    return localShop.getEquipped(item.category) === item.id;
  }, [dbItems, localShop]);

  const handleBuy = async (item) => {
    const owned = hasPurchased(item.id);
    const isDbOnly = DB_ONLY_CATEGORIES.has(item.category);

    if (owned) {
      // Already owned — equip
      if (!isDbOnly) localShop.equip(item.category, item.id);
      if (user) {
        try {
          await storeService.equipItem(user.id, item.id);
          await reloadDbItems();
        } catch { /* ignore */ }
      }
      showFlash(`¡${item.title} equipado!`, true);
      return;
    }

    if (user) {
      try {
        await storeService.purchaseItem(user.id, item.id);
        await reloadDbItems();
        if (!isDbOnly) localShop.equip(item.category, item.id);
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
      const ok = localPurchase(item.id);
      if (ok) {
        localShop.equip(item.category, item.id);
        showFlash(`¡${item.title} comprado y equipado!`, true);
      } else {
        showFlash(dancoins.coins < item.price ? 'Dancoins insuficientes' : 'Error al comprar', false);
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
    <div className="shopPage max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section with Animated Background */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 p-8 md:p-12 min-h-[320px] flex flex-col justify-center group/hero">
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
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 leading-none">
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
                className="relative px-8 py-4 bg-white text-black font-black text-sm rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden group/daily"
                onClick={handleDaily}
              >
                <span className="relative z-10">RECLAMAR BONUS DIARIO</span>
                <span className="relative z-10 text-xl text-yellow-500">✨</span>
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

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400/80">Equipamiento Actual</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {equippedSummary.map(item => (
                <div key={item.id} className="flex items-center gap-3 pl-4 pr-3 py-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 group/eitem transition-all hover:border-pink-500/30">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-bold text-white/80">{item.title}</span>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-red-500 hover:text-white transition-all text-[8px]"
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
        <div className="shopHintCategories">
          <span>🎨 Temas — cambia la paleta de colores</span>
          <span>🖱️ Cursores — trail de partículas</span>
          <span>💤 Screensavers — animación tras inactividad</span>
          <span>🖼️ Banners — fondo de tu perfil</span>
          <span>🔲 Marcos — borde de tu avatar</span>
          <span>🐱 Mascota — accesorios para el gato</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
        {/* Advanced Filters */}
        <div className="flex-1">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
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
        <div className="relative min-w-[300px] group/search">
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
                  <div className="relative z-10 bg-[#080810] rounded-[calc(2rem-1.5px)] p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-4xl">{item.icon}</div>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-white uppercase">{item.rarity}</span>
                    </div>
                    <h3 className="text-xl font-black italic mb-2 tracking-tighter">{item.title}</h3>
                    <p className="text-xs text-white/40 mb-6 line-clamp-2">{item.desc || item.description}</p>
                    <div className="mt-auto">
                      <button
                        className={`w-full py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all ${canAfford ? 'bg-white text-black hover:shadow-[0_0_20px_white]' : 'bg-white/5 text-white/20'}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford}
                      >
                        {owned ? 'ADQUIRIR' : `VENDER POR ◈ ${item.price}`}
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

      <div className="shopGrid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
              className={`group shopCard-v2 relative flex flex-col bg-white/[0.03] border border-white/10 rounded-3xl p-5 transition-all hover:bg-white/[0.07] hover:-translate-y-1 ${owned ? 'owned' : ''} ${equipped ? 'equipped border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.15)]' : ''} ${item.partnership_only && (!partnership || isLevelLocked) ? 'opacity-40 grayscale-50' : ''}`}
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
                  <div className="p-3 bg-black/40 rounded-2xl flex items-center justify-center min-w-[64px] min-h-[64px] border border-white/5 relative">
                    {item.preview_url ? (
                      <img
                        src={item.preview_url}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded-lg pixelated transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
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
                  <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed mb-3">
                    {item.desc || item.description || "Sin descripción disponible."}
                  </p>
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
                          <span>◈</span> {item.price}
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
