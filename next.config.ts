import type { NextConfig } from 'next'
import path from 'path'

// build:static → NEXT_EXPORT=1 npm run build → output: 'export' para Tauri/Capacitor
const isStaticExport = process.env.NEXT_EXPORT === '1'

// Security headers — only injected in server/SSR mode (not compatible with static export).
// CSP is intentionally permissive on script/style/connect to support Next.js inline scripts,
// Tailwind inline styles, LiveKit WebRTC, Supabase/Colyseus WebSockets, and external CDN images.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src * data: blob:",
      "media-src * blob:",
      "connect-src * wss: ws:",
      "font-src 'self' data:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
      }
    : {
        experimental: {
          mcpServer: true,
        },
        async headers() {
          return [{ source: '/(.*)', headers: securityHeaders }]
        },
      }),
  images: {
    unoptimized: true, // Necesario para static export; en web no penaliza
  },
  turbopack: {
    // Raíz del proyecto — __dirname ya apunta a la carpeta del proyecto
    root: path.resolve(__dirname),
  },
}

export default nextConfig
