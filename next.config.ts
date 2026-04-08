import type { NextConfig } from 'next'
import path from 'path'

// build:static → NEXT_EXPORT=1 npm run build → output: 'export' para Tauri/Capacitor
const isStaticExport = process.env.NEXT_EXPORT === '1'

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
      }),
  images: {
    unoptimized: true, // Necesario para static export; en web no penaliza
  },
  turbopack: {
    root: path.resolve(__dirname, '../../../'),
  },
}

export default nextConfig
