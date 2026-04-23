import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { EconomyProvider } from '@/contexts/EconomyContext'
import { UniverseProvider } from '@/contexts/UniverseContext'
import { YouTubeProvider } from '@/contexts/YouTubeContext'
import { CosmicProvider } from '@/components/Effects/CosmicProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <YouTubeProvider>
      <AuthProvider>
        <EconomyProvider>
          <UniverseProvider>
            <CosmicProvider>
              {children}
            </CosmicProvider>
          </UniverseProvider>
        </EconomyProvider>
      </AuthProvider>
    </YouTubeProvider>
  )
}
