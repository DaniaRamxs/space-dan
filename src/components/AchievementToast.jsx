import { useEffect, useState } from 'react';

export default function AchievementToast() {
  const [queue, setQueue]   = useState([]);
  const [visible, setVisible] = useState(null);

  // Listen for achievement unlocks
  useEffect(() => {
    const handler = (e) => {
      const ach = e.detail?.achievement;
      if (!ach) return;
      setQueue(prev => [...prev, { ...ach, key: Date.now() }]);
    };
    window.addEventListener('dan:achievement-unlocked', handler);
    return () => window.removeEventListener('dan:achievement-unlocked', handler);
  }, []);

  // Dequeue one at a time
  useEffect(() => {
    if (visible || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setVisible(next);
    const t = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(t);
  }, [queue, visible]);

  if (!visible) return null;

  return (
    <div className="achievementToast" key={visible.key}>
      <div className="achToastIcon">{visible.icon}</div>
      <div className="achToastBody">
        <div className="achToastLabel">¡Logro desbloqueado!</div>
        <div className="achToastTitle">{visible.title}</div>
        <div className="achToastDesc">{visible.desc}</div>
        {visible.coins > 0 && (
          <div className="achToastCoins">+{visible.coins} ◈</div>
        )}
      </div>
    </div>
  );
}
