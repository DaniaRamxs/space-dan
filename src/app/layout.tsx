import type { Metadata } from 'next'
import { Providers } from './providers'
import { NativeInit } from '@/components/NativeInit'

// Estilos globales de Spacely
import './globals.css'
import '@/styles/spacely.css'
import '@/styles/index.css'
import '@/styles/banner-effects.css'
import '@/styles/NicknameStyles.css'
import '@/styles/profile-v2.css'
import '@/styles/GlobalChat.css'
import '@/styles/global-music-feed.css'
import '@/styles/snake-game.css'
import '@/styles/spotify-stats.css'
import '@/styles/lastfm-panel.css'

export const metadata: Metadata = {
  title: 'Spacely',
  description: 'Tu universo digital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {/* Inicialización nativa (Tauri/Capacitor) — solo corre en cliente */}
          <NativeInit />
          {children}
        </Providers>
      </body>
    </html>
  )
}
