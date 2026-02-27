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
import { getFrameStyle } from '../utils/styles';
import RadioSvg from '../components/RadioSvg';
import '../styles/NicknameStyles.css';

// Categories that only live in the DB (no localStorage visual effect)
const DB_ONLY_CATEGORIES = new Set(['banner', 'frame', 'pet_accessory', 'nickname_style', 'profile_theme', 'role', 'ambient_sound']);

const CAT_LABELS = {
  theme: 'Perfil_Col',
  cursor: 'Partículas_FX',
  screensaver: 'Sleep_Modes',
  stars: 'Atmósfera_Estelar',
  radio: 'Frecuencias_Radio',
  banner: 'Banners_Ident',
  frame: 'Marcos_Avatar',
  pet_accessory: 'Genética_Pet',
  nickname_style: 'Estilo_Nick',
  profile_theme: 'Universos_Exp',
  role: 'Rangos_Rango',
  ambient_sound: 'Ambientes_Snd',
};

// Preferred category order in the tab bar
const CAT_ORDER = ['profile_theme', 'nickname_style', 'role', 'ambient_sound', 'theme', 'cursor', 'screensaver', 'stars', 'radio', 'banner', 'frame', 'pet_accessory'];

export default function ShopPage() {
  const { user, profile } = useAuthContext();
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
    if (item.category === 'radio') return hasPurchased(item.id);

    // Prioridad 1: Base de datos (para items permanentes de cuenta)
    const isEquippedDb = user && dbItems.some(ui => ui.item_id === item.id && ui.is_equipped);
    if (isEquippedDb) return true;

    // Prioridad 2: LocalStorage (para themes, cursores, o si no está logueado)
    const isEquippedLocal = localShop.getEquipped(item.category) === item.id;
    return !!isEquippedLocal;
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

        // Equipar automáticamente tras comprar
        localShop.equip(item.category, item.id);
        await storeService.equipItem(user.id, item.id);
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
    try {
      // Siempre intentamos desequipar localmente para limpiar estados inconsistentes
      localShop.unequip(item.category);

      if (user) {
        await storeService.unequipItem(user.id, item.id);
        await reloadDbItems();
        // Disparar evento para que otros componentes (como el Avatar) reaccionen
        window.dispatchEvent(new CustomEvent('dan:item-equipped', {
          detail: { category: item.category, itemId: null }
        }));
      }
      showFlash(`${item.title} desequipado correctamente`, true);
    } catch (err) {
      console.error('[ShopPage] unequip error:', err);
      showFlash('Error al desequipar el ítem', false);
    }
  };

  const handleTesterCoins = async () => {
    if (!user) {
      // Para guests
      localStorage.setItem('space-dan-coins', '999999');
      window.dispatchEvent(new CustomEvent('dan:coins-changed'));
      showFlash('MODO TESTER: 999,999 Dancoins obtenidas (Local)', true);
    } else {
      try {
        await storeService.awardCoins(user.id, 1000000, 'tester_bonus', null, 'Acceso Tester');
        showFlash('MODO TESTER: 1,000,000 Dancoins otorgadas', true);
      } catch (err) {
        showFlash('Error al otorgar coins de tester', false);
      }
    }
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
    <div className="shopPage max-w-7xl mx-auto px-0 md:px-6 py-4 sm:py-8 space-y-12 min-h-screen pb-64">

      {/* Activation Chamber Header */}
      <div className="relative mx-4 md:mx-0 rounded-[2.5rem] overflow-hidden bg-[#070710] border border-white/5 p-8 md:p-14 flex flex-col justify-center min-h-[300px]">
        {/* Sutil depth effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-[10px] font-semibold text-cyan-400/60 uppercase tracking-[0.2em] font-mono">:: Cámara_de_Activación</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 leading-none">
            Bóveda_Estelar
          </h1>

          <div className="flex flex-wrap items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.3em] font-mono mb-1">:: Balance_Sincronizado</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold font-mono tracking-tighter text-white/90">◈ {currentCoins}</span>
                {canClaimDailyNow && (
                  <button
                    onClick={handleDaily}
                    className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/30 transition-all underline decoration-cyan-400/20 underline-offset-4"
                  >
                    :: Reclamar_Bonus_Diario
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Corporate branding (Minimal) */}
        <div className="absolute right-12 bottom-12 hidden lg:flex flex-col items-end opacity-[0.05]">
          <span className="text-6xl font-black italic leading-none font-mono">DAN</span>
          <span className="text-2xl font-light tracking-[0.5em] leading-none uppercase">System_Vault</span>
        </div>
      </div>

      {flash && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 rounded-xl backdrop-blur-xl border border-white/5 shadow-2xl font-mono text-[10px] tracking-[0.1em] font-semibold animate-in slide-in-from-top-4 duration-300 ${flash.ok ? 'bg-white/5 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </div>
      )}

      {equippedSummary.length > 0 && (
        <div className="mx-4 md:mx-0 p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[9px] font-semibold text-white/30 uppercase tracking-[0.3em] font-mono">:: Equipo_Activo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {equippedSummary.map(item => (
                <div key={item.id} className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                  <span className="text-lg opacity-60">{item.icon}</span>
                  <span className="text-[10px] font-bold text-white/60 tracking-tight uppercase">{item.title}</span>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded-lg bg-white/5 text-white/20 hover:bg-red-500/20 hover:text-red-400 transition-all text-[8px]"
                    onClick={() => handleUnequip(item)}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 md:mx-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
          <p className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono mb-3">:: Inf_de_Suministro</p>
          <p className="text-[11px] text-white/40 leading-relaxed font-medium">
            Gana ◈ visitando sectores, sincronizando datos diarios y completando hitos de sistema.
          </p>
        </div>
        {!user && (
          <div className="p-6 bg-red-500/[0.03] border border-red-500/20 rounded-2xl flex items-center gap-4">
            <span className="text-xl">⚠️</span>
            <p className="text-[10px] text-red-400/60 font-medium leading-relaxed">
              <span className="font-black uppercase tracking-widest block mb-1">Restricción_de_Acceso</span>
              Requiere conexión estelar para desbloquear Banners, Marcos y Genética de Mascota.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
        <div className="flex-1">
          <div className="mobile-scroll-x px-4 md:px-0 pb-2 flex gap-2">
            {categories.map(c => (
              <button
                key={c.id}
                className={`px-5 py-2 rounded-xl text-[9px] font-semibold tracking-[0.2em] uppercase transition-all whitespace-nowrap border ${activeCategory === c.id
                  ? 'bg-white/10 text-white border-white/30 shadow-lg'
                  : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.05] hover:text-white/60'
                  }`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label.includes(' ') ? c.label.split(' ')[1] : c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:min-w-[320px] lg:w-auto px-4 md:px-0">
          <input
            type="text"
            placeholder="Filtrar telemetría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-12 py-3 text-[11px] font-medium transition-all focus:bg-white/5 focus:border-white/20 outline-none placeholder:text-white/10 text-white/60"
          />
          <div className="absolute left-8 md:left-4 top-1/2 -translate-y-1/2 text-white/10">
            🔍
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
            {featuredItems.map(item => {
              const owned = hasPurchased(item.id);
              const equipped = isItemEquipped(item);
              const canAfford = currentCoins >= item.price;
              return (
                <div key={`feat-${item.id}`} className="group relative rounded-[2rem] bg-white/[0.02] border border-white/5 p-6 overflow-hidden hover:bg-white/[0.04] transition-all duration-500">
                  <div className="flex justify-between items-start mb-8">
                    <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-700">{item.icon}</div>
                    <span className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono">:: {item.rarity || 'standard'}_class</span>
                  </div>

                  <h3 className="text-xl font-bold text-white/90 mb-2 tracking-tight uppercase">{item.title}</h3>
                  <p className="text-[12px] font-medium text-white/50 leading-relaxed mb-6 line-clamp-3">
                    {item.desc || item.description || "Segmento de datos sin descripción."}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-semibold text-white/10 uppercase tracking-[0.2em] font-mono">Precio_Activación</span>
                      <span className="text-sm font-bold font-mono text-white/40 group-hover:text-white/60 transition-colors">◈ {item.price}</span>
                    </div>

                    <button
                      className={`px-6 py-2.5 rounded-xl font-bold text-[10px] tracking-[0.1em] uppercase transition-all ${equipped ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : owned ? 'bg-white/10 text-white hover:bg-white/20' : canAfford ? 'bg-white text-black hover:scale-105 active:scale-95' : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'}`}
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford && !owned}
                    >
                      {equipped ? ':: Activo' : owned ? 'Aplicar' : user ? 'Activar' : 'Conec_Req'}
                    </button>
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
                  <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-3xl mb-4 opacity-20">🔒</span>
                    <div className="font-semibold text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1 font-mono">:: Vínculo_Requerido</div>
                    <p className="text-[9px] text-white/10 font-mono tracking-wider">Solo para parejas del Universo</p>
                  </div>
                ) : (
                  (() => {
                    const frameLevelMatch = item.id.match(/lv(\d+)/);
                    const itemLevel = frameLevelMatch ? parseInt(frameLevelMatch[1], 10) : 0;
                    const userLevel = partnership.evolution_level || 1;

                    if (itemLevel > userLevel) {
                      return (
                        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                          <span className="text-3xl mb-4 opacity-20">⚡</span>
                          <div className="font-semibold text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1 font-mono">:: NIVEL_REQ_{itemLevel}+</div>
                          <p className="text-[9px] text-white/10 font-mono tracking-wider">Vínculo Actual: NVL_{userLevel}</p>
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
                        <span className={`text-base whitespace-nowrap ${getNicknameClass({ equipped_nickname_style: item.id })}`}>
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
                            <span className="relative px-6 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 flex items-center gap-3 shadow-xl hover:scale-105 transition-transform duration-500">
                              <span className="text-lg opacity-80">{item.icon}</span>
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
                          <div className={`text-[7px] font-semibold uppercase text-white/20 font-mono tracking-widest`}>
                            {item.category === 'cursor' ? 'Trail_FX' : 'UI_Sample'}
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
                          <div className="px-2 py-0.5 rounded bg-white/5 backdrop-blur-md border border-white/5 text-[7px] font-semibold text-white/30 font-mono uppercase tracking-widest">:: Estilo_Cosmos</div>
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
                        <span className="mt-3 text-[7px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono">:: Atmósfera_Estelar</span>
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
                    ) : item.category === 'frame' ? (
                      <div className="relative w-16 h-16 flex items-center justify-center scale-90 group-hover:scale-110 transition-transform duration-500">
                        {(() => {
                          const frameObj = getFrameStyle(item.id);
                          const frameClass = frameObj?.className || '';
                          const isEvolutivo = frameClass.includes('marco-evolutivo');
                          const isLv5 = item.id === 'frame_link_lv5';

                          return (
                            <div
                              className={`relative w-full h-full flex items-center justify-center ${frameClass} ${!frameClass && !(frameObj.border || frameObj.backgroundImage) ? 'rounded-full border border-white/20' : ''}`}
                              style={isEvolutivo ? {} : frameObj}
                            >
                              <div className={isLv5 ? 'marco-evolutivo-lv5-img-wrapper scale-[0.85]' : `w-full h-full ${isEvolutivo ? 'rounded-full' : 'rounded-[inherit]'} overflow-hidden flex items-center justify-center`}>
                                <img
                                  src={profile?.avatar_url || '/dan_profile.jpg'}
                                  alt="Preview"
                                  className="w-[90%] h-[90%] object-cover rounded-full"
                                />
                              </div>
                            </div>
                          );
                        })()}
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
                  <h3 className="font-bold text-[13px] tracking-tight text-white/90 mb-1 group-hover:text-cyan-400 transition-colors uppercase">
                    {item.title}
                  </h3>
                  <p className={`text-[10px] font-medium text-white/40 leading-relaxed ${expandedItems.has(item.id) ? 'mb-2' : 'line-clamp-2 mb-1'}`}>
                    {item.desc || item.description || "Segmento de datos sin descripción."}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      {owned ? (
                        <span className="text-[8px] font-semibold text-cyan-500/40 uppercase tracking-[0.2em] font-mono">:: Adquirido</span>
                      ) : (
                        <>
                          <span className="text-[8px] font-semibold text-white/10 uppercase tracking-[0.2em] font-mono">Precio_Act</span>
                          <span className="text-[11px] font-bold font-mono text-white/30 group-hover:text-white/50 transition-colors">◈ {item.price}</span>
                        </>
                      )}
                    </div>

                    {equipped ? (
                      <button
                        className="text-[9px] text-white/20 hover:text-red-400 transition-colors uppercase font-semibold tracking-widest font-mono"
                        onClick={() => handleUnequip(item)}
                      >Desactivar_::</button>
                    ) : (
                      <button
                        className={`px-4 py-2 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all ${owned ? 'bg-white/5 text-white/60 hover:bg-white/10' : canAfford ? 'bg-white text-black hover:scale-105' : 'bg-white/5 text-white/10 cursor-not-allowed opacity-40'}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford && !owned}
                      >
                        {owned ? 'Aplicar' : 'Activar'}
                      </button>
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
