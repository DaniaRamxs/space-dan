import { useState, useEffect } from 'react';
import { SHOP_ITEMS, purchaseItem } from '../hooks/useShopItems';
import useShopItems from '../hooks/useShopItems';
import useDancoins from '../hooks/useDancoins';
import { trackPageVisit } from '../hooks/useDancoins';
import { unlockAchievement } from '../hooks/useAchievements';

const CATEGORIES = [
  { id: 'all',         label: '✦ Todo'         },
  { id: 'cursor',      label: '🖱️ Cursores'     },
  { id: 'screensaver', label: '💤 Screensavers'  },
  { id: 'stars',       label: '⭐ Estrellas'     },
  { id: 'radio',       label: '📻 Radio'         },
];

export default function ShopPage() {
  const { coins, claimDailyBonus, canClaimDaily } = useDancoins();
  const { hasPurchased, equip, getEquipped }       = useShopItems();
  const [activeCategory, setActiveCategory]        = useState('all');
  const [flash, setFlash]                          = useState(null);

  useEffect(() => {
    trackPageVisit('/tienda');
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, []);

  // Check rich achievement
  useEffect(() => {
    if (coins >= 500) unlockAchievement('rich');
  }, [coins]);

  const handleBuy = (item) => {
    if (hasPurchased(item.id)) {
      equip(item.category, item.id);
      setFlash({ msg: `¡${item.title} equipado!`, ok: true });
    } else {
      const ok = purchaseItem(item.id);
      if (ok) {
        equip(item.category, item.id);
        setFlash({ msg: `¡${item.title} comprado y equipado!`, ok: true });
      } else {
        setFlash({ msg: coins < item.price ? 'Dancoins insuficientes' : 'Error al comprar', ok: false });
      }
    }
    setTimeout(() => setFlash(null), 2500);
  };

  const handleDaily = () => {
    const claimed = claimDailyBonus();
    setFlash(claimed
      ? { msg: '¡+30 Dancoins! Bonus diario reclamado', ok: true }
      : { msg: 'Ya reclamaste el bonus de hoy', ok: false }
    );
    setTimeout(() => setFlash(null), 2500);
  };

  const filtered = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(i => i.category === activeCategory);

  return (
    <div className="shopPage">
      <div className="shopHeader">
        <h1 className="shopTitle">TIENDA.exe</h1>
        <div className="shopWallet">
          <span className="shopCoins">◈ {coins} Dancoins</span>
          {canClaimDaily() && (
            <button className="shopDailyBtn" onClick={handleDaily}>
              🎁 Bonus diario (+30 ◈)
            </button>
          )}
        </div>
      </div>

      {flash && (
        <div className={`shopFlash${flash.ok ? ' ok' : ' err'}`}>{flash.msg}</div>
      )}

      <div className="shopHint">
        Gana ◈ visitando páginas, jugando, desbloqueando logros y reclamando el bonus diario.
        Los items comprados se equipan automáticamente.
      </div>

      <div className="shopCategories">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`shopCatBtn${activeCategory === c.id ? ' active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="shopGrid">
        {filtered.map(item => {
          const owned    = hasPurchased(item.id);
          const isEquipped = getEquipped(item.category) === item.id;
          const canAfford = coins >= item.price;

          return (
            <div key={item.id} className={`shopCard${owned ? ' owned' : ''}${isEquipped ? ' equipped' : ''}`}>
              <div className="shopCardIcon">{item.icon}</div>
              <div className="shopCardBody">
                <div className="shopCardTitle">{item.title}</div>
                <div className="shopCardDesc">{item.desc}</div>
                <div className="shopCardCategory">{item.category}</div>
              </div>
              <div className="shopCardFooter">
                {isEquipped
                  ? <span className="shopEquippedBadge">✓ Equipado</span>
                  : owned
                    ? <button className="shopBuyBtn secondary" onClick={() => handleBuy(item)}>Equipar</button>
                    : (
                      <button
                        className={`shopBuyBtn${canAfford ? '' : ' disabled'}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford}
                      >
                        ◈ {item.price}
                      </button>
                    )
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
