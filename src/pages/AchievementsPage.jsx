import { useEffect } from 'react';
import useAchievements, { ACHIEVEMENTS, unlockAchievement } from '../hooks/useAchievements';
import { trackPageVisit } from '../hooks/useDancoins';
import { useEconomy } from '../contexts/EconomyContext';

export default function AchievementsPage() {
  const { unlocked } = useAchievements();
  const { balance }  = useEconomy();

  useEffect(() => {
    trackPageVisit('/logros');
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAchievement('night_owl');
  }, []);

  const totalCoinsFromAch = ACHIEVEMENTS
    .filter(a => unlocked.includes(a.id))
    .reduce((s, a) => s + a.coins, 0);

  return (
    <div className="achPage">
      <div className="achHeader">
        <h1 className="achTitle">LOGROS.exe</h1>
        <div className="achStats">
          <span className="achStatBadge">
            {unlocked.length} / {ACHIEVEMENTS.length} desbloqueados
          </span>
          <span className="achStatBadge coins">
            ◈ {balance} Dancoins
          </span>
        </div>
      </div>

      <div className="achProgressWrap">
        <div className="achProgress">
          <div
            className="achProgressBar"
            style={{ width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
        <span className="achProgressLabel">
          {Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}%
        </span>
      </div>

      <div className="achGrid">
        {ACHIEVEMENTS.map(ach => {
          const isUnlocked = unlocked.includes(ach.id);
          return (
            <div key={ach.id} className={`achCard${isUnlocked ? ' unlocked' : ' locked'}`}>
              <div className="achCardIcon">{isUnlocked ? ach.icon : '🔒'}</div>
              <div className="achCardBody">
                <div className="achCardTitle">{isUnlocked ? ach.title : '???'}</div>
                <div className="achCardDesc">
                  {isUnlocked ? ach.desc : 'Logro secreto — sigue explorando'}
                </div>
                {ach.coins > 0 && (
                  <div className={`achCardCoins${isUnlocked ? '' : ' dimmed'}`}>
                    +{ach.coins} ◈
                  </div>
                )}
              </div>
              {isUnlocked && <div className="achCardCheck">✓</div>}
            </div>
          );
        })}
      </div>

      <div className="achFooter">
        Total ganado por logros: <strong>{totalCoinsFromAch} ◈</strong>
      </div>
    </div>
  );
}
