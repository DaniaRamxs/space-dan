import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargamos TODAS las envs (VITE_, NEXT_PUBLIC_) para inyectarlas como
  // constantes reemplazables en el bundle. Esto elimina referencias a
  // `process.env.X` en runtime (el WebView de Capacitor NO tiene `process`).
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);

  // Construimos un define dinámico: cada NEXT_PUBLIC_* y VITE_* se
  // reemplaza literalmente por su valor stringificado.
  const envDefines = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value),
    ])
  );

  return {
    plugins: [react()],
    base: './',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      // IMPORTANTE: NO hacemos `'process.env': 'import.meta.env'` porque
      // es un reemplazo de string literal que rompe código como
      // `typeof process !== 'undefined'` o `process.env.NODE_ENV.startsWith(...)`.
      //
      // En su lugar:
      // 1. Forzamos `process.env.NODE_ENV` al modo actual de Vite.
      // 2. Reemplazamos cada `process.env.NEXT_PUBLIC_*` y `process.env.VITE_*`
      //    usado en el código con su valor literal en build time.
      // 3. Shim final `process.env = {}` para que libs que hagan
      //    `typeof process.env !== 'undefined'` no truenen.
      'process.env.NODE_ENV': JSON.stringify(mode),
      ...envDefines,
      'process.env': '({})',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      strictPort: false,
    },
    build: {
      // Android WebView 7/8 soporta ES2019; es2015 es innecesariamente conservador
      // y genera bundles más pesados sin beneficio real (API 24+ es requisito de Capacitor 5+).
      target: 'es2019',
      outDir: 'dist',
      emptyOutDir: true,
      // Sourcemaps ayudan a debuggear pantallas negras en el WebView vía chrome://inspect.
      // Desactívalos en release final si te preocupa el tamaño del APK.
      sourcemap: true,
    },
  };
});
