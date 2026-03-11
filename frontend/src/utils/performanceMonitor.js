// Performance monitoring y métricas
export const performanceMonitor = {
  // Medir tiempo de carga de componentes
  measureComponentLoad: (componentName, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`[Performance] ${componentName}: ${end - start}ms`);
    
    // Enviar a analytics si está disponible
    if (window.gtag) {
      window.gtag('event', 'component_load_time', {
        component_name: componentName,
        load_time: Math.round(end - start)
      });
    }
    
    return result;
  },
  
  // Medir tiempo de render
  measureRender: (componentName) => {
    return (WrappedComponent) => {
      return (props) => {
        const start = performance.now();
        
        useEffect(() => {
          const end = performance.now();
          console.log(`[Performance] ${componentName} render: ${end - start}ms`);
        });
        
        return <WrappedComponent {...props} />;
      };
    };
  },
  
  // Detectar slow renders
  detectSlowRenders: (threshold = 100) => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > threshold) {
          console.warn(`[Performance] Slow render detected: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
  },
  
  // Memory usage
  checkMemoryUsage: () => {
    if (performance.memory) {
      const memory = performance.memory;
      const used = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const total = (memory.totalJSHeapSize / 1048576).toFixed(2);
      const limit = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
      
      console.log(`[Memory] Used: ${used}MB, Total: ${total}MB, Limit: ${limit}MB`);
      
      // Alerta si usa más del 80%
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
        console.warn('[Memory] High memory usage detected!');
      }
    }
  },
  
  // FPS monitoring
  monitorFPS: () => {
    let fps = 0;
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFPS = (currentTime) => {
      frames++;
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          console.warn(`[Performance] Low FPS: ${fps}`);
        }
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    return fps;
  }
};
