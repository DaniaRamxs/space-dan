// Optimización de imágenes y assets
export const imageOptimization = {
  // Formatos modernos
  formats: {
    avif: 'image/avif',
    webp: 'image/webp',
    fallback: 'image/jpeg'
  },
  
  // Tamaños responsive
  sizes: {
    avatar: [32, 64, 128, 256],
    banner: [400, 800, 1200, 1600],
    thumbnail: [150, 300, 450],
    game: [400, 800, 1200]
  },
  
  // Calidad por tipo
  quality: {
    avatar: 80,
    banner: 75,
    thumbnail: 70,
    game: 85
  },
  
  // Lazy loading con intersection observer
  lazyLoad: (img) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  },
  
  // Preload de imágenes críticas
  preloadCritical: (urls) => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }
};
