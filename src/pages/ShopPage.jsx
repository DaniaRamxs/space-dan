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
  const { hasPurchased, equip, unequip, getEquipped } = useShopItems();
  const [activeCategory, setActiveCategory]          = useState('all');
  const [flash, setFlash]                            = useState(null);

  useEffect(() => {
    trackPageVisit('/tienda');
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, []);

  useEffect(() => {
    if (coins >= 500) unlockAchievement('rich');
  }, [coins]);

  const showFlash = (msg, ok) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  const handleBuy = (item) => {
    if (hasPurchased(item.id)) {
      equip(item.category, item.id);
      showFlash(`¡${item.title} equipado!`, true);
    } else {
      const ok = purchaseItem(item.id);
      if (ok) {
        equip(item.category, item.id);
        showFlash(`¡${item.title} comprado y equipado!`, true);
      } else {
        showFlash(coins < item.price ? 'Dancoins insuficientes' : 'Error al comprar', false);
      }
    }
  };

  const handleUnequip = (item) => {
    unequip(item.category);
    showFlash(`${item.title} desequipado`, true);
  };

  const handleDaily = () => {
    const claimed = claimDailyBonus();
    showFlash(
      claimed ? '¡+30 Dancoins! Bonus diario reclamado' : 'Ya reclamaste el bonus de hoy',
      claimed
    );
  };

  const filtered = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(i => i.category === activeCategory);

  // Equipped summary — all currently equipped items
  const equippedSummary = SHOP_ITEMS.filter(item => getEquipped(item.category) === item.id);

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
        <div>Gana ◈ visitando páginas, jugando, desbloqueando logros y reclamando el bonus diario.</div>
        <div className="shopHintCategories">
          <span>🖱️ Cursores — trail de partículas al mover el mouse</span>
          <span>💤 Screensavers — animación tras 30s sin actividad</span>
          <span>⭐ Estrellas — color del fondo estelar animado</span>
          <span>📻 Radio — estaciones extra en el reproductor 📻</span>
        </div>
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
          const owned      = hasPurchased(item.id);
          const isEquipped = getEquipped(item.category) === item.id;
          const canAfford  = coins >= item.price;

          return (
            <div key={item.id} className={`shopCard${owned ? ' owned' : ''}${isEquipped ? ' equipped' : ''}`}>
              <div className="shopCardIcon">{item.icon}</div>
              <div className="shopCardBody">
                <div className="shopCardTitle">{item.title}</div>
                <div className="shopCardDesc">{item.desc}</div>
                {item.swatch && (
                  <div className="shopCardSwatches">
                    {item.swatch.map(c => (
                      <span key={c} className="shopCardSwatch" style={{ background: c }} />
                    ))}
                  </div>
                )}
                <div className="shopCardCategory">{item.category}</div>
              </div>
              <div className="shopCardFooter">
                {isEquipped ? (
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
                      <div className="shopShortfall">Te faltan {item.price - coins} ◈</div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
