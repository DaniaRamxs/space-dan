import { useEffect, useState, useRef } from 'react';

const DURATION = 4000;

export default function AchievementToast() {
  const [queue, setQueue]     = useState([]);
  const [visible, setVisible] = useState(null);
  const timerRef              = useRef(null);

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

  const dismiss = () => {
    clearTimeout(timerRef.current);
    setVisible(null);
  };

  // Dequeue one at a time
  useEffect(() => {
    if (visible || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setVisible(next);
    timerRef.current = setTimeout(dismiss, DURATION);
    return () => clearTimeout(timerRef.current);
  }, [queue, visible]);

  if (!visible) return null;

  return (
    <div className="achievementToast" key={visible.key} onClick={dismiss}>
      <div className="achToastIcon">{visible.icon}</div>
      <div className="achToastBody">
        <div className="achToastLabel">¡Logro desbloqueado!</div>
        <div className="achToastTitle">{visible.title}</div>
        <div className="achToastDesc">{visible.desc}</div>
        {visible.coins > 0 && (
          <div className="achToastCoins">+{visible.coins} ◈</div>
        )}
      </div>
      <button
        className="achToastClose"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Cerrar"
      >✕</button>
      <div className="achToastProgress" style={{ animationDuration: `${DURATION}ms` }} />
    </div>
  );
}
