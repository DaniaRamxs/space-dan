// Manual cache clearing for specific chunks
(function() {
  'use strict';
  
  // Clear problematic chunks from cache
  const problematicChunks = [
    'games-core-C8gLOLp8.js',
    'livekit-C9buWMbF.js',
    'konva-BTpBkuHr.js'
  ];
  
  // Clear from all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.open(cacheName).then(function(cache) {
            return Promise.all(
              problematicChunks.map(function(chunk) {
                return cache.delete(chunk).catch(() => {});
              })
            );
          });
        })
      );
    });
  }
  
  // Force reload only once
  if (!sessionStorage.getItem('cacheCleared')) {
    sessionStorage.setItem('cacheCleared', 'true');
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  }
})();
