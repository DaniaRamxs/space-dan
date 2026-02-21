import { useState, useEffect } from 'react';

const NS = 'space-dan.netlify';

/**
 * Increments and returns the view counter for a post via counterapi.dev.
 * Each page load counts as one view.
 *
 * @param {string|number} postId
 * @returns {number|null} view count (null while loading)
 */
export default function usePostViews(postId) {
  const [views, setViews] = useState(null);

  useEffect(() => {
    const id = String(postId);
    fetch(`https://api.counterapi.dev/v1/${NS}/post-${id}-views/up`)
      .then((r) => r.json())
      .then((data) => setViews(data.count ?? 0))
      .catch(() => setViews(null));
  }, [postId]);

  return views;
}
