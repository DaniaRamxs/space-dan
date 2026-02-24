import { useState, useEffect, useCallback, useMemo } from 'react';
import { SHOP_ITEMS, purchaseItem as localPurchase } from '../hooks/useShopItems';
import useShopItems from '../hooks/useShopItems';
import useDancoins from '../hooks/useDancoins';
import { useEconomy } from '../contexts/EconomyContext';
import { useAuthContext } from '../contexts/AuthContext';
import * as storeService from '../services/store';
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
  const [flash, setFlash] = useState(null);
  const [dbItems, setDbItems] = useState([]);      // user_items: {item_id, is_equipped, item}[]
  const [dbCatalog, setDbCatalog] = useState([]);      // store_items from DB
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Load full store catalog from DB (banners, frames, pet accs)
  useEffect(() => {
    if (!user) return;
    setCatalogLoading(true);
    storeService.getStoreItems()
      .then(items => setDbCatalog(items || []))
      .catch(err => console.error('[ShopPage] getStoreItems:', err))
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

  const filtered = activeCategory === 'all'
    ? fullCatalog
    : fullCatalog.filter(i => i.category === activeCategory);

  const equippedSummary = fullCatalog.filter(item => isItemEquipped(item));

  return (
    <div className="shopPage">
      <div className="shopHeader">
        <h1 className="shopTitle">TIENDA.exe</h1>
        <div className="shopWallet">
          <span className="shopCoins">◈ {currentCoins} Dancoins</span>
          {canClaimDailyNow && (
            <button className="shopDailyBtn" onClick={handleDaily}>
              🎁 Bonus diario (+30 ◈)
            </button>
          )}
        </div>
      </div>

      {flash && (
        <div className={`shopFlash${flash.ok ? ' ok' : ' err'}`}>{flash.msg}</div>
      )}

      {equippedSummary.length > 0 && (
        <div className="shopEquippedBar">
          <span className="shopEquippedBarLabel">Equipado:</span>
          {equippedSummary.map(item => (
            <span key={item.id} className="shopEquippedBarItem">
              {item.icon} {item.title}
              <button
                className="shopUnequipBtn"
                title="Desequipar"
                onClick={() => handleUnequip(item)}
              >✕</button>
            </span>
          ))}
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

      <div className="shopCategories">
        {categories.map(c => (
          <button
            key={c.id}
            className={`shopCatBtn${activeCategory === c.id ? ' active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {catalogLoading && (
        <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6, fontSize: '0.9rem' }}>
          cargando_tienda...
        </div>
      )}

      <div className="shopGrid">
        {filtered.map(item => {
          const owned = hasPurchased(item.id);
          const equipped = isItemEquipped(item);
          const canAfford = currentCoins >= item.price;

          return (
            <div key={item.id} className={`shopCard${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}`}>
              <div className="shopCardIcon">
                {item.preview_url ? (
                  <img
                    src={item.preview_url}
                    alt={item.title}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, imageRendering: 'pixelated' }}
                  />
                ) : (
                  item.icon
                )}
              </div>
              <div className="shopCardBody">
                <div className="shopCardTitle">{item.title}</div>
                <div className="shopCardDesc">{item.desc || item.description}</div>
                {item.swatch && (
                  <div className="shopCardSwatches">
                    {item.swatch.map(c => (
                      <span key={c} className="shopCardSwatch" style={{ background: c }} />
                    ))}
                  </div>
                )}
                {item.rarity && item.rarity !== 'common' && (
                  <div className="shopCardCategory" style={{
                    color: item.rarity === 'legendary' ? '#ffd700'
                      : item.rarity === 'epic' ? '#b464ff'
                        : item.rarity === 'rare' ? '#00e5ff'
                          : 'var(--text)',
                  }}>
                    {item.rarity}
                  </div>
                )}
                <div className="shopCardCategory">{CAT_LABELS[item.category] || item.category}</div>
              </div>
              <div className="shopCardFooter">
                {equipped ? (
                  <div className="shopEquippedState">
                    <span className="shopEquippedBadge">✓ Equipado</span>
                    <button
                      className="shopUnequipCardBtn"
                      onClick={() => handleUnequip(item)}
                    >desequipar</button>
                  </div>
                ) : owned ? (
                  <button className="shopBuyBtn secondary" onClick={() => handleBuy(item)}>Equipar</button>
                ) : (
                  <>
                    <button
                      className={`shopBuyBtn${canAfford ? '' : ' disabled'}`}
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                    >
                      ◈ {item.price}
                    </button>
                    {!canAfford && (
                      <div className="shopShortfall">Te faltan {item.price - currentCoins} ◈</div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!user && (
        <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '0.85rem' }}>
          Inicia sesión para acceder a banners, marcos y accesorios para tu mascota.
        </div>
      )}
    </div>
  );
}
