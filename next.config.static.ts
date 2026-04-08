/**
 * Configuración de Next.js para builds estáticos (Tauri desktop + Capacitor mobile).
 * Usar con: NEXT_CONFIG=static next build
 *
 * Salida: carpeta /out (compatible con webDir de Capacitor y frontendDist de Tauri)
 *
 * USO:
 *   npm run build:static   → genera /out para Tauri y Capacitor
 *   npm run build          → SSR normal para web (Vercel)
 */
import type { NextConfig } from 'next'

const staticConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // No MCP server en builds estáticos
  experimental: {},
}

export default staticConfig
