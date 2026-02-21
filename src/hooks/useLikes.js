import { useState, useCallback, useEffect } from 'react';

const NS = 'space-dan.netlify';
const LS_KEY = 'space-dan-likes';

function loadLS() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY));
    return {
      ids: Array.isArray(raw?.ids) ? raw.ids : [],
      counts: raw?.counts && typeof raw.counts === 'object' ? raw.counts : {},
    };
  } catch {
    return { ids: [], counts: {} };
  }
}

function saveLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { }
}

export default function useLikes(postId) {
  const id = String(postId);

  const [liked, setLiked] = useState(() => loadLS().ids.includes(id));
  const [count, setCount] = useState(() => loadLS().counts[id] ?? 0);

  // GET the real count on mount
  useEffect(() => {
    fetch(`https://api.counterapi.dev/v1/${NS}/post-${id}-likes`)
      .then(r => r.json())
      .then(data => {
        // Solo actualizar si la API devuelve un numero valido (incluso 0, o > 0)
        // Y actualizamos el estado visual para que no se quede en 0 si en la nube hay más.
        if (typeof data.count === 'number') {
          const d = loadLS();
          // Tomar el mayor entre lo local y lo de la nube
          const maxCount = Math.max(d.counts[id] ?? 0, data.count);

          if (maxCount !== d.counts[id]) {
            d.counts[id] = maxCount;
            saveLS(d);
          }

          setCount(maxCount);
        }
      })
      .catch(() => { });
  }, [id]);

  const toggle = useCallback(() => {
    const d = loadLS();
    const wasLiked = d.ids.includes(id);

    if (!wasLiked) {
      // Like
      d.ids = [...d.ids, id];
      const newCount = (d.counts[id] ?? 0) + 1;
      d.counts[id] = newCount;
      saveLS(d);
      setLiked(true);
      setCount(newCount);

      fetch(`https://api.counterapi.dev/v1/${NS}/post-${id}-likes/up`)
        .then(r => r.json())
        .then(data => {
          if (typeof data.count === 'number' && data.count > 0) {
            const dLatest = loadLS();
            dLatest.counts[id] = Math.max(dLatest.counts[id] ?? 0, data.count);
            saveLS(dLatest);
            setCount(dLatest.counts[id]);
          }
        }).catch(() => { });
    } else {
      // Unlike
      d.ids = d.ids.filter(i => i !== id);
      const newCount = Math.max(0, (d.counts[id] ?? 1) - 1);
      d.counts[id] = newCount;
      saveLS(d);
      setLiked(false);
      setCount(newCount);

      fetch(`https://api.counterapi.dev/v1/${NS}/post-${id}-likes/down`)
        .then(r => r.json())
        .then(data => {
          if (typeof data.count === 'number' && data.count >= 0) {
            const dLatest = loadLS();
            // In unlike, we sync the cloud value since it should decrease
            dLatest.counts[id] = data.count > 0 ? data.count : dLatest.counts[id];
            saveLS(dLatest);
            if (data.count > 0) setCount(dLatest.counts[id]);
          }
        }).catch(() => { });
    }
  }, [id]);

  return [count, liked, toggle];
}
