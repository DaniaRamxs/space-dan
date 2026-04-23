import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    'process.env': 'import.meta.env'
  },
  build: {
    target: 'es2015'
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
    outDir: 'dist',
    emptyOutDir: true,
  },
});
