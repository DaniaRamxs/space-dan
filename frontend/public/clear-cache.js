// ULTRA AGGRESSIVE CACHE CLEARING
(function() {
  'use strict';
  
  console.log('🧹 Starting ultra aggressive cache clearing...');
  
  // 1. Clear ALL caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      console.log('📦 Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName).then(function(success) {
            console.log('✅ Deleted cache:', cacheName, success);
          }).catch(function(err) {
            console.log('❌ Failed to delete cache:', cacheName, err);
          });
        })
      );
    }).then(function() {
      console.log('🎉 ALL CACHES CLEARED');
    });
  }
  
  // 2. Clear ALL storage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('💾 Storage cleared');
  } catch (e) {
    console.log('❌ Storage clear failed:', e);
  }
  
  // 3. Clear IndexedDB
  if ('indexedDB' in window) {
    indexedDB.databases().then(function(databases) {
      return Promise.all(
        databases.map(function(db) {
          return indexedDB.deleteDatabase(db.name).then(function() {
            console.log('🗄️ Deleted IndexedDB:', db.name);
          });
        })
      );
    });
  }
  
  // 4. Force reload with cache busting
  const bustCache = function() {
    const url = new URL(window.location);
    url.searchParams.set('t', Date.now());
    window.location.replace(url.toString());
  };
  
  // 5. Prevent infinite reload
  if (!sessionStorage.getItem('ultraCacheCleared')) {
    sessionStorage.setItem('ultraCacheCleared', 'true');
    console.log('🔄 Will reload in 1 second...');
    setTimeout(bustCache, 1000);
  } else {
    console.log('✅ Cache already cleared, preventing reload');
    sessionStorage.removeItem('ultraCacheCleared');
  }
})();
