import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHOP_ITEMS } from '../hooks/useShopItems';
import useShopItems from '../hooks/useShopItems';
import useStarlys from '../hooks/useStarlys';
import { useEconomy } from '../contexts/EconomyContext';
import { useAuthContext } from '../contexts/AuthContext';
import * as storeService from '../services/store';
import { unlockAchievement } from '../hooks/useAchievements';
import {
  ShoppingBag, Sparkles, User, MessageSquare,
  Radio, Box, Star, Shield,
  ChevronRight, Search, CreditCard as ReloadIcon,
  X, CheckCircle2, Zap, Layout
} from 'lucide-react';
import { getNicknameClass, getUserDisplayName } from '../utils/user';
import { getFrameStyle } from '../utils/styles';
import ChatBadge from '../components/Social/ChatBadge';
import '../styles/NicknameStyles.css';

const CAT_LABELS = {
  nickname_style: 'Estilos_Nick',
  frame: 'Marcos_Avatar',
  role: 'Roles_Especiales',
  chat_effect: 'Efectos_Chat',
  chat_badge: 'Emblemas_Chat',
  radio: 'Radios_Equipables',
  holocard: 'HoloCards_Ident',
  chest: 'Cofres_Colección',
};

const CAT_ICONS = {
  nickname_style: <User size={14} />,
  frame: <Shield size={14} />,
  role: <Star size={14} />,
  chat_effect: <Sparkles size={14} />,
  chat_badge: <MessageSquare size={14} />,
  radio: <Radio size={14} />,
  holocard: <Layout size={14} />,
  chest: <Box size={14} />,
};

const CAT_ORDER = ['nickname_style', 'frame', 'role', 'chat_effect', 'chat_badge', 'radio', 'holocard', 'chest'];

export default function ShopPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const { balance } = useEconomy();
  const starlys = useStarlys();
  const localShop = useShopItems();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState(null);
  const [dbItems, setDbItems] = useState([]);
  const [dbCatalog, setDbCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Gacha states
  const [openingChest, setOpeningChest] = useState(null);
  const [chestResult, setChestResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState([]);
  const [spinOffset, setSpinOffset] = useState(0);
  const WINNING_INDEX = 40;

  // Preview states
  const [activePreview, setActivePreview] = useState(null);

  const currentCoins = user ? balance : starlys.coins;

  useEffect(() => {
    if (!user) return;
    setCatalogLoading(true);
    storeService.getStoreItems()
      .then(items => setDbCatalog(items || []))
      .catch(err => console.error('[ShopPage] load error:', err))
      .finally(() => setCatalogLoading(false));
  }, [user?.id]);

  const reloadDbItems = useCallback(async () => {
    if (!user) return;
    const items = await storeService.getUserItems(user.id);
    setDbItems(items || []);
  }, [user?.id]);

  useEffect(() => {
    reloadDbItems();
  }, [reloadDbItems]);

  const showFlash = (msg, ok) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  const fullCatalog = useMemo(() => {
    const staticItems = SHOP_ITEMS;
    if (!user) return staticItems;
    const staticIds = new Set(staticItems.map(i => i.id));
    const extra = dbCatalog.filter(i => !staticIds.has(i.id));

    // Agregamos ítems exclusivos obtenidos (cofres) que no son parte de catalog activo
    const ownedExtra = dbItems
      .filter(ui => ui.item && !staticIds.has(ui.item.id) && !extra.some(e => e.id === ui.item.id))
      .map(ui => ui.item);

    return [...staticItems, ...extra, ...ownedExtra].filter(i => CAT_ORDER.includes(i.category));
  }, [user, dbCatalog, dbItems]);

  const categories = useMemo(() => {
    const list = [{ id: 'all', label: '✦ Todo', icon: <ShoppingBag size={14} /> }];
    CAT_ORDER.forEach(cat => {
      if (fullCatalog.some(i => i.category === cat)) {
        list.push({ id: cat, label: CAT_LABELS[cat] || cat, icon: CAT_ICONS[cat] });
      }
    });
    return list;
  }, [fullCatalog]);

  const hasPurchased = useCallback((itemId) => {
    if (user) return dbItems.some(ui => ui.item_id === itemId);
    return localShop.hasPurchased(itemId);
  }, [user, dbItems, localShop]);

  const isItemEquipped = useCallback((item) => {
    const isEquippedDb = user && dbItems.some(ui => ui.item_id === item.id && ui.is_equipped);
    if (isEquippedDb) return true;
    const isEquippedLocal = localShop.getEquipped(item.category);
    if (item.category === 'radio' && Array.isArray(isEquippedLocal)) {
      return isEquippedLocal.includes(item.id);
    }
    return !!isEquippedLocal && isEquippedLocal === item.id;
  }, [dbItems, localShop, user]);

  const handleBuy = async (item) => {
    if (item.category === 'chest') {
      if (currentCoins < item.price) return showFlash('Starlys insuficientes', false);
      setOpeningChest(item);
      try {
        const res = await storeService.openChest(user?.id, item.id);
        if (res.success) {
          const fakeItems = Array.from({ length: WINNING_INDEX + 5 }).map((_, i) => {
            if (i === WINNING_INDEX) return { ...res.item, drop_type: res.drop_type };
            const rarities = ['common', 'common', 'common', 'common', 'rare', 'rare', 'rare', 'epic', 'epic', 'legendary', 'mythic'];
            return { type: 'fake', rarity: rarities[Math.floor(Math.random() * rarities.length)] };
          });
          setSpinItems(fakeItems);
          setIsSpinning(true);
          setSpinOffset(0);

          // Force reflow and start animation
          setTimeout(() => {
            setSpinOffset(WINNING_INDEX);
          }, 50);

          // Wait for animation equivalent 5s + 500ms grace period
          setTimeout(() => {
            setIsSpinning(false);
            setChestResult(res);
            reloadDbItems();
          }, 5500);
        }
      } catch (err) {
        showFlash(err.message || 'Error al abrir cofre', false);
        setOpeningChest(null);
      }
      return;
    }

    const owned = hasPurchased(item.id);
    if (owned) {
      localShop.equip(item.category, item.id);
      if (user) {
        try {
          await storeService.equipItem(user.id, item.id);
          await reloadDbItems();
        } catch {
          showFlash('Error al sincronizar con el servidor', false);
        }
      }
      showFlash(`${item.title} equipado`, true);
      window.dispatchEvent(new CustomEvent('dan:item-equipped', { detail: item }));
      return;
    }

    if (currentCoins < item.price) {
      showFlash('Starlys insuficientes', false);
      return;
    }

    if (user) {
      try {
        await storeService.purchaseItem(user.id, item.id);
        await reloadDbItems();
        localShop.equip(item.category, item.id);
        await storeService.equipItem(user.id, item.id);
        await reloadDbItems();
        showFlash(`¡${item.title} obtenido!`, true);
        unlockAchievement('shopper');
      } catch (err) {
        showFlash(err.message || 'Error al comprar', false);
      }
    } else {
      const result = localShop.purchaseItem(item.id);
      if (result) {
        localShop.equip(item.category, item.id);
        showFlash(`¡${item.title} obtenido!`, true);
      }
    }
  };

  const handleUnequip = async (item) => {
    localShop.unequip(item.category, item.id);
    if (user) {
      try {
        await storeService.unequipItem(user.id, item.id);
        await reloadDbItems();
      } catch (err) {
        console.error(err);
      }
    }
    showFlash(`${item.title} desequipado`, true);
  };

  const filteredItems = useMemo(() => {
    let result = fullCatalog;
    if (activeCategory !== 'all') {
      result = result.filter(i => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.desc || i.description)?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [fullCatalog, activeCategory, searchQuery]);

  const featuredItems = useMemo(() => {
    return fullCatalog
      .filter(i => (i.rarity === 'legendary' || i.rarity === 'epic'))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [fullCatalog]);

  // Scroll to preview when it opens
  const previewRef = useCallback(node => {
    if (node !== null) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050510] text-white font-sans pb-40">
      {/* Header with Balance and Reload */}
      <div className="relative pt-24 pb-12 px-6 overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <Zap size={14} className="animate-pulse" /> Estación de Suministros
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
              BÓVEDA_<span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-white to-purple-400">ESTELAR</span>
            </h1>
            <p className="text-sm md:text-base font-medium text-white/40 max-w-xl leading-relaxed">
              Equípate para la interacción social masiva. Cosméticos, identidades y artefactos coleccionables para destacar en Spacely.
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] flex flex-col items-center gap-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col items-center gap-2 relative z-10">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Starlys_Disponibles</span>
              <div className="text-5xl font-black font-mono tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                ◈ {currentCoins.toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => navigate('/tienda-galactica')}
              className="group flex items-center gap-4 px-8 py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] relative z-10"
            >
              <ReloadIcon size={16} />
              Recargar Starlys
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Interactive Preview Section */}
        {activePreview && (
          <div ref={previewRef} className="max-w-7xl mx-auto mt-20 p-8 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl animate-in zoom-in-95 duration-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6">
              <button onClick={() => setActivePreview(null)} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 space-y-8 w-full">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em]">Vista_Previa_Interactiva</span>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">{activePreview.title}</h3>
                </div>

                {/* Simulation Area */}
                <div className="p-10 rounded-[2.5rem] bg-black/40 border border-white/5 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                  {/* Nickname Style Preview */}
                  {activePreview.category === 'nickname_style' && (
                    <div className="space-y-4 text-center">
                      <span className={`text-5xl font-black tracking-tighter ${getNicknameClass({ equipped_nickname_style: activePreview.id })}`}>
                        {user ? getUserDisplayName(user) : 'Explorador_Dan'}
                      </span>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Así se verá tu identidad en el nexo social.</p>
                    </div>
                  )}

                  {/* Frame Preview */}
                  {activePreview.category === 'frame' && (
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <div className={`relative w-full h-full flex items-center justify-center ${getFrameStyle(activePreview.id)?.className || ''}`}
                        style={getFrameStyle(activePreview.id)?.className ? {} : getFrameStyle(activePreview.id)}>
                        <img src={user?.user_metadata?.avatar_url || '/dan_profile.jpg'} className="w-[85%] h-[85%] object-cover rounded-full border border-white/10" />
                      </div>
                    </div>
                  )}

                  {/* Holocard Preview */}
                  {activePreview.category === 'holocard' && (
                    <div className={`w-full max-w-sm aspect-[1.6/1] rounded-[2.5rem] border flex flex-col p-10 relative overflow-hidden shadow-2xl transition-all duration-700 ${activePreview.id.includes('glass') ? 'bg-white/5 backdrop-blur-3xl border-white/20' :
                      activePreview.id.includes('cyber') ? 'bg-cyan-500/10 border-cyan-500/20' :
                        activePreview.id.includes('void') ? 'bg-black border-white/5' :
                          activePreview.id.includes('prism') || activePreview.id.includes('mythic') ? 'bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-cyan-500/20 border-white/30' :
                            'bg-white/10 border-white/10'
                      }`}>
                      {/* Sub-patterns based on type */}
                      {activePreview.id.includes('cyber') && (
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #00f2ff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                      )}
                      {activePreview.id.includes('prism') && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      )}

                      <div className="relative z-10 flex gap-6 items-center">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center p-0.5 ${activePreview.id.includes('void') ? 'bg-white/10' : 'bg-white/5'}`}>
                          <img src={user?.user_metadata?.avatar_url || '/dan_profile.jpg'} className="w-full h-full object-cover rounded-[1.2rem] opacity-80" />
                        </div>
                        <div className="space-y-1">
                          <div className={`h-5 w-40 rounded-full ${activePreview.id.includes('void') ? 'bg-white/20' : 'bg-white/10'}`} />
                          <div className={`h-3 w-24 rounded-full ${activePreview.id.includes('void') ? 'bg-white/10' : 'bg-white/5'}`} />
                        </div>
                      </div>
                      <div className="mt-auto flex justify-between items-end relative z-10">
                        <div className="space-y-3">
                          <div className="h-2 w-32 bg-white/5 rounded-full" />
                          <div className="h-2 w-24 bg-white/5 rounded-full" />
                        </div>
                        <span className="text-[10px] font-black font-mono text-white/10 uppercase tracking-widest">{activePreview.id}</span>
                      </div>
                    </div>
                  )}

                  {/* Chat Preview */}
                  {(activePreview.category === 'chat_effect' || activePreview.category === 'chat_badge' || activePreview.category === 'role') && (
                    <div className="w-full max-w-lg space-y-6">
                      <div className="relative flex gap-4 p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 transition-all duration-1000">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                          <img
                            src={user?.user_metadata?.avatar_url || '/dan_profile.jpg'}
                            className="w-full h-full object-cover opacity-80"
                            alt="Preview Avatar"
                          />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {/* Unified Badge Preview */}
                            <ChatBadge
                              badge={activePreview?.category === 'chat_badge' ? activePreview : profile?.equipped_badge}
                              color={profile?.badge_color}
                              size={12}
                              className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                            />
                            {activePreview.category === 'role' && (
                              <span className="px-3 py-1 rounded-lg bg-cyan-400/10 text-cyan-400 text-[9px] font-black uppercase tracking-wider border border-cyan-400/20">
                                {activePreview.title}
                              </span>
                            )}
                            <span className="font-black text-sm text-white/90">
                              {user ? getUserDisplayName(user) : 'Explorador_Dan'} <span className="text-white/20 font-medium ml-1">#0001</span>
                            </span>
                          </div>
                          <div className={`p-4 rounded-2xl bg-white/5 text-sm text-white/70 leading-relaxed border border-white/5 transition-all duration-500 ${activePreview.category === 'chat_effect'
                            ? `chat-effect-${activePreview.id.replace('chat_', '')} text-white`
                            : ''
                            }`}>
                            ¡Hola explorador! Estás visualizando cómo se verá tu mensaje en el chat global con este efecto activo.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Radio Preview */}
                  {activePreview.category === 'radio' && (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-cyan-400/10 border-4 border-cyan-400/20 flex items-center justify-center animate-spin-slow">
                        <Radio size={40} className="text-cyan-400" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-black text-xl uppercase italic">Spacely_Waves</h4>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Sintonizando: {activePreview.title}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 md:mt-0 md:w-80 space-y-6">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{activePreview.category}</span>
                  <p className="text-[13px] font-medium text-white/40 leading-relaxed italic">"{activePreview.desc || activePreview.description}"</p>
                </div>
                <button
                  onClick={() => handleBuy(activePreview)}
                  className="w-full py-5 rounded-2xl bg-white text-black text-[12px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl"
                >
                  {hasPurchased(activePreview.id) ? 'Equipar Suministro' : `Invertir ◈ ${activePreview.price.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-24">
        {/* Nav & Search */}
        <div className="flex flex-col lg:flex-row gap-8 items-center sticky top-24 z-50 py-6 bg-[#050510]/60 backdrop-blur-2xl px-6 -mx-6 rounded-b-[2.5rem] border-b border-white/5">
          <div className="flex-1 overflow-x-auto custom-scrollbar-hide flex gap-3 w-full lg:w-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat.id
                  ? 'bg-white text-black border-white shadow-[0_5px_15px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'
                  }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative group w-full lg:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Escanear catálogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-7 text-[12px] font-bold outline-none focus:bg-white/[0.05] focus:border-cyan-500/30 transition-all placeholder:text-white/10 text-white/80"
            />
          </div>
        </div>

        {/* Featured - Destacados */}
        {activeCategory === 'all' && !searchQuery && (
          <div className="space-y-10">
            <div className="flex items-center gap-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 whitespace-nowrap">Destacados de la Temporada</h2>
              <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {featuredItems.map(item => (
                <ItemCard key={`feat-${item.id}`} item={item} onBuy={handleBuy} onUnequip={handleUnequip} onPreview={() => setActivePreview(item)} isEquipped={isItemEquipped(item)} owned={hasPurchased(item.id)} featured />
              ))}
            </div>
          </div>
        )}

        {/* Catalog Grid */}
        <div className="space-y-10 pb-20">
          <div className="flex items-center gap-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 whitespace-nowrap">
              {activeCategory === 'all' ? 'Últimas Novedades' : CAT_LABELS[activeCategory]}
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent"></div>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-64 bg-white/[0.02] border border-white/5 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} onBuy={handleBuy} onUnequip={handleUnequip} onPreview={() => setActivePreview(item)} isEquipped={isItemEquipped(item)} owned={hasPurchased(item.id)} />
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                <Box size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] text-white/20">Telemetría no encontrada</p>
                <p className="text-[10px] font-medium text-white/10 lowercase">Prueba cambiando la categoría o el filtro de búsqueda.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gacha Modal */}
      {openingChest && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-xl animate-in fade-in duration-300 isolate">
          {(isSpinning || (!chestResult && !isSpinning)) ? (
            <div className="w-full flex flex-col items-center overflow-hidden">
              <h2 className="text-2xl font-black uppercase text-cyan-400 mb-8 tracking-[0.2em] animate-pulse">
                Desencriptando Suministro
              </h2>
              <div className="relative w-full overflow-hidden h-72 border-y border-white/10 shadow-2xl flex flex-col justify-center" style={{ background: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(10,15,22,1) 50%, rgba(0,0,0,1) 100%)' }}>

                {/* Selector Line (The needle) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-amber-400 z-50 transform -translate-x-1/2 shadow-[0_0_20px_#fbbf24] blur-[0.5px] pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 clip-polygon-[50%_100%,_0_0,_100%_0]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-400 clip-polygon-[50%_0,_0_100%,_100%_100%]" />
                </div>

                {spinItems.length > 0 ? (
                  <div
                    className="flex items-center gap-4 absolute left-1/2 transition-transform ease-[cubic-bezier(0.15,0.85,0.1,1)]"
                    style={{
                      transitionDuration: isSpinning ? '5.0s' : '0s',
                      transform: `translateX(calc(-50% - ${(spinOffset * 176)}px))` // 160px card + 16px gap
                    }}
                  >
                    {spinItems.map((spinItem, idx) => {
                      const isFake = spinItem.type === 'fake';
                      const rarity = isFake ? spinItem.rarity : (spinItem.rarity || 'common');
                      // Random background pattern to simulate items inside fake boxes
                      const bgColors = {
                        mythic: 'bg-rose-500/10 border-rose-500/50 shadow-[inset_0_0_50px_rgba(225,29,72,0.2)]',
                        legendary: 'bg-amber-500/10 border-amber-500/50 shadow-[inset_0_0_50px_rgba(245,158,11,0.2)]',
                        epic: 'bg-purple-500/10 border-purple-500/50 shadow-[inset_0_0_50px_rgba(168,85,247,0.2)]',
                        rare: 'bg-cyan-500/10 border-cyan-500/50 shadow-[inset_0_0_50px_rgba(6,182,212,0.2)]',
                        common: 'bg-white/5 border-white/20'
                      };

                      return (
                        <div key={idx} className={`w-40 h-56 rounded-2xl flex-shrink-0 flex items-center justify-center border-b-4 overflow-hidden relative ${bgColors[rarity] || bgColors.common} ${isFake ? 'opacity-80' : 'opacity-100 z-10 scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}>
                          {isFake ? (
                            <div className="text-5xl opacity-20 filter blur-[2px]">?</div>
                          ) : (
                            spinItem.drop_type === 'character' || spinItem.image_url ? (
                              <img src={spinItem.image_url} className="w-full h-full object-cover rounded-t-[14px]" />
                            ) : (
                              <div className="text-6xl drop-shadow-2xl">{spinItem.icon || '🎁'}</div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full flex justify-center"><Box size={64} className="text-cyan-400 animate-spin" /></div>
                )}
              </div>

              <div className="mt-8 text-[10px] text-white/30 uppercase tracking-[0.4em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Sincronizando inventario
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-12 max-w-lg w-full animate-in zoom-in-95 duration-500 p-4 relative z-50">
              <div className="relative group">
                <div className={`absolute -inset-10 blur-[100px] opacity-40 transition-opacity ${chestResult?.item?.rarity === 'mythic' ? 'bg-rose-500' :
                  chestResult?.item?.rarity === 'legendary' ? 'bg-amber-500' :
                    chestResult?.item?.rarity === 'epic' ? 'bg-purple-500' : 'bg-cyan-500'
                  }`} />

                {chestResult.drop_type === 'character' ? (
                  <img src={chestResult?.item?.image_url} alt={chestResult?.item?.name} className="w-80 aspect-[2/3] object-cover rounded-[3rem] border border-white/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative z-10" />
                ) : (
                  <div className="w-80 aspect-[2/3] bg-[#0a0f16] border border-white/20 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 flex items-center justify-center text-8xl backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none rounded-[3rem]" />
                    {chestResult?.item?.icon || '🎁'}
                  </div>
                )}

                <div className="absolute top-6 right-6 z-20 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                  {chestResult?.item?.rarity || 'common'}
                </div>
              </div>

              <div className="text-center space-y-4 relative z-10 w-full">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.6em]">
                  {chestResult.drop_type === 'character' ? (chestResult?.item?.series || 'Desconocida') : (CAT_LABELS[chestResult?.item?.category] || 'Cosmético Exclusivo')}
                </span>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">
                  {chestResult.drop_type === 'character' ? (chestResult?.item?.name || 'Personaje Anónimo') : (chestResult?.item?.title || 'Ítem Misterioso')}
                </h2>
                <p className="text-sm text-white/40 font-medium italic">
                  "{chestResult.drop_type === 'character' ? chestResult.item.description : chestResult.item.desc || chestResult.item.description}"
                </p>

                {chestResult.is_duplicate && (
                  <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl space-y-2">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">Sistema_Reciclaje</span>
                    <p className="text-[12px] font-bold text-white/60 uppercase tracking-widest">
                      Duplicado detectado. Recibes <span className="text-rose-400">◈ {chestResult.recycle_value}</span> Starlys.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => { setOpeningChest(null); setChestResult(null); setSpinItems([]); }}
                  className="mt-12 w-full py-5 rounded-2xl bg-white text-black text-[12px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-2xl"
                >
                  Continuar Exploración
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flash Feedback */}
      {flash && (
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-[2rem] backdrop-blur-3xl border flex items-center gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 ${flash.ok ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${flash.ok ? 'bg-cyan-400/20' : 'bg-red-400/20'}`}>
            {flash.ok ? <CheckCircle2 size={16} /> : <X size={16} />}
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest leading-none">{flash.msg}</span>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onBuy, onUnequip, onPreview, isEquipped, owned, featured }) {
  const { user, profile } = useAuthContext();
  const titleColor = item.rarity === 'mythic' ? 'text-rose-400' : item.rarity === 'legendary' ? 'text-amber-400' : item.rarity === 'epic' ? 'text-purple-400' : 'text-white';
  const rarityBorder = item.rarity === 'mythic' ? 'border-rose-400/30' : item.rarity === 'legendary' ? 'border-amber-400/20' : item.rarity === 'epic' ? 'border-purple-400/20' : 'border-white/5';
  const rarityGlow = item.rarity === 'mythic' ? 'shadow-[0_0_40px_rgba(251,113,133,0.2)]' : item.rarity === 'legendary' ? 'shadow-[0_0_30px_rgba(251,191,36,0.1)]' : item.rarity === 'epic' ? 'shadow-[0_0_30px_rgba(168,85,247,0.1)]' : '';

  const renderPreview = () => {
    if (item.category === 'nickname_style') {
      return (
        <div className="flex flex-col items-center justify-center w-full p-4 bg-white/5 rounded-2xl border border-white/10 min-h-[100px]">
          <span className={`text-lg font-bold whitespace-nowrap ${getNicknameClass({ equipped_nickname_style: item.id })}`}>
            {user ? getUserDisplayName(user) : 'Explorador_DAN'}
          </span>
          <span className="text-[7px] text-white/20 mt-2 uppercase tracking-widest font-mono">:: Previsualización_Nick</span>
        </div>
      );
    }

    if (item.category === 'chat_effect') {
      const effectClass = `chat-effect-${item.id.replace('chat_', '')}`;
      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[100px] p-2">
          <div className={`w-full p-2.5 rounded-xl border border-white/5 bg-white/5 text-[9px] text-white/60 leading-tight transition-all duration-700 ${effectClass}`}>
            <span className="font-bold block mb-0.5 text-[7px] text-white/40">MENSAJE_SIM</span>
            ¡Hola explorador!
          </div>
        </div>
      );
    }

    if (item.category === 'radio') {
      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[100px] gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
              {item.icon}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 h-3 items-end">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-0.5 bg-cyan-400/40 rounded-full animate-bounce"
                  style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
          <span className="text-[7px] text-white/20 uppercase tracking-widest font-black font-mono">:: Audio_Stream</span>
        </div>
      );
    }

    if (item.category === 'frame') {
      const frameObj = getFrameStyle(item.id);
      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[100px] relative">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div
              className={`relative w-full h-full flex items-center justify-center ${frameObj?.className || ''}`}
              style={frameObj?.className ? {} : frameObj}
            >
              <img
                src={profile?.avatar_url || '/dan_profile.jpg'}
                alt="Preview"
                className="w-[85%] h-[85%] object-cover rounded-full border border-white/10 shadow-lg"
              />
            </div>
          </div>
        </div>
      );
    }

    if (item.category === 'chat_badge') {
      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[100px] gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 shadow-lg group-hover:border-cyan-500/30 transition-colors">
            <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10">
              <img
                src={profile?.avatar_url || '/dan_profile.jpg'}
                alt="Mini Avatar"
                className="w-full h-full object-cover opacity-80"
              />
            </div>
            <ChatBadge badge={item} color={profile?.badge_color} size={10} />
            <span className="text-[9px] font-black text-white/40 truncate max-w-[60px] uppercase tracking-tighter">
              {user ? getUserDisplayName(user) : 'Explorador'}
            </span>
          </div>
          <span className="text-[7px] text-white/20 uppercase tracking-widest font-black font-mono">:: Pre_Emblema</span>
        </div>
      );
    }

    if (item.category === 'holocard') {
      const isGold = item.id.includes('gold');
      const isMatrix = item.id.includes('matrix');
      const isVoid = item.id.includes('void');
      const isNebula = item.id.includes('nebula');
      const isGlass = item.id.includes('glass');
      const isCyber = item.id.includes('cyber');

      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[120px]">
          <div className={`w-32 aspect-[1.6/1] rounded-2xl border-2 flex flex-col p-3 relative overflow-hidden shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3
            ${isGold ? 'bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 border-amber-300/50 shadow-amber-500/20' :
              isMatrix ? 'bg-zinc-950 border-green-500/40 shadow-green-500/10' :
                isVoid ? 'bg-[#030305] border-white/5 shadow-white/5' :
                  isNebula ? 'bg-gradient-to-tr from-indigo-900 via-purple-600 to-rose-500 border-rose-400/40 shadow-purple-500/20' :
                    isGlass ? 'bg-white/5 backdrop-blur-xl border-white/30' :
                      isCyber ? 'bg-[#0a0a15] border-cyan-500/30' : 'bg-white/10 border-white/10'
            }`}>

            {/* Glossy Overlay for all */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-30 pointer-events-none" />

            {/* Specific Patterns */}
            {isMatrix && <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,rgba(34,197,94,.1)_1px,transparent_1px),linear-gradient(0deg,rgba(34,197,94,.1)_1px,transparent_1px)] bg-[size:10px_10px]" />}
            {isGold && <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 animate-[shimmer_3s_infinite]" />}

            <div className="flex gap-2 items-center relative z-10">
              <div className={`w-6 h-6 rounded-lg overflow-hidden border ${isGold ? 'border-amber-200/50' : 'border-white/20'} bg-black/20`}>
                <img src={profile?.avatar_url || '/dan_profile.jpg'} className="w-full h-full object-cover opacity-80" />
              </div>
              <div className={`h-2 w-14 rounded-full ${isGold ? 'bg-amber-100/50' : 'bg-white/20'}`} />
            </div>

            <div className="mt-auto flex flex-col gap-1.5 relative z-10">
              <div className={`h-1.5 w-20 rounded-full ${isGold ? 'bg-amber-100/30' : 'bg-white/10'}`} />
              <div className={`h-1.5 w-12 rounded-full ${isGold ? 'bg-amber-100/20' : 'bg-white/5'}`} />
            </div>

            {/* Bottom Glow for Mythics */}
            {(item.rarity === 'mythic' || isNebula || isVoid) && (
              <div className={`absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-20 h-5 blur-xl opacity-60 ${isVoid ? 'bg-white/20' : isNebula ? 'bg-rose-500' : 'bg-cyan-500'
                }`} />
            )}
          </div>
          <span className={`text-[7px] mt-4 uppercase tracking-[0.3em] font-black font-mono transition-colors ${isGold ? 'text-amber-400' : isMatrix ? 'text-green-400' : isNebula ? 'text-rose-400' : 'text-white/20'
            }`}>
            :: {item.title.replace(' ', '_')}
          </span>
        </div>
      );
    }

    return (
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-lg transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-white/[0.03] border border-white/10`}>
        {item.icon}
      </div>
    );
  };

  return (
    <div className={`group relative flex flex-col bg-[#070710] border rounded-[2.5rem] p-8 transition-all duration-500 hover:-translate-y-3 ${featured ? 'min-h-[350px] border-white/10 shadow-2xl' : rarityBorder
      } ${isEquipped ? 'border-cyan-500/50 bg-cyan-500/[0.03] shadow-[0_15px_40px_-10px_rgba(34,211,238,0.2)]' : 'hover:border-white/20'} ${rarityGlow}`}>

      {/* Visual background for card */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-[inherit]" />

      {/* Rarity & Icon / Preview */}
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className="flex-1 mr-4">
          {renderPreview()}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] ${item.rarity === 'mythic' ? 'text-rose-400 border-rose-400/40 bg-rose-400/5' :
            item.rarity === 'legendary' ? 'text-amber-400 border-amber-400/30' :
              item.rarity === 'epic' ? 'text-purple-400 border-purple-400/30' : 'text-white/20'
            }`}>
            {item.rarity || 'Common'}
          </span>
          <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em] font-mono">{item.category}</span>
        </div>
      </div>

      <div className="space-y-3 mb-10 relative z-10">
        <h3 className={`text-xl font-black uppercase tracking-tighter leading-tight ${titleColor}`}>{item.title}</h3>
        <p className="text-[12px] font-medium text-white/30 leading-relaxed line-clamp-3">
          {item.desc || item.description || "Segmento de telemetría sin procesar."}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-6 pt-6 border-t border-white/5 relative z-10">
        <div className="flex flex-col">
          {owned ? (
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> ADQUIRIDO
            </span>
          ) : (
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Inversión</span>
              <span className="text-lg font-black font-mono text-white tracking-tighter">◈ {item.price.toLocaleString()}</span>
            </div>
          )}
        </div>

        {isEquipped ? (
          <button
            onClick={() => onUnequip(item)}
            className="px-6 py-3 rounded-2xl bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 transition-all border border-cyan-500/20 hover:border-red-500/40"
          >
            Equipado
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {!owned && item.category !== 'chest' && (
              <button
                onClick={() => onPreview()}
                className="p-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                title="Vista previa interactiva"
              >
                <ChevronRight size={16} className="rotate-270" />
              </button>
            )}
            <button
              onClick={() => onBuy(item)}
              className={`px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${owned
                ? 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                : 'bg-white text-black hover:bg-cyan-400 hover:scale-105 active:scale-95 shadow-xl font-sans'
                }`}
            >
              {owned ? 'Equipar' : item.category === 'chest' ? 'Abrir ◈' : 'Pagar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
