'use client'
/**
 * Layout del área principal de Spacely.
 * force-dynamic: evita prerender estático — estos componentes son client-only.
 * Todos los componentes son ssr:false porque usan window/navigator al inicializar.
 */
export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import loadDynamic from 'next/dynamic'
import { AppTrackers } from './AppTrackers'

const GardenLayout      = loadDynamic(() => import('@/layouts/GardenLayout'),                        { ssr: false })
const AchievementToast  = loadDynamic(() => import('@/components/AchievementToast'),                 { ssr: false })
const StellarOnboarding = loadDynamic(() => import('@/components/Social/StellarOnboarding'),         { ssr: false })
const RedemptionInvite  = loadDynamic(() => import('@/components/Social/RedemptionInvite'),          { ssr: false })
const TycoonInvite      = loadDynamic(() => import('@/components/Social/TycoonInvite'),              { ssr: false })
const ScrollToTop       = loadDynamic(() => import('@/components/ScrollToTop'),                      { ssr: false })
const ActivityRadar     = loadDynamic(() => import('@/components/ActivityRadar'),                    { ssr: false })
const WelcomeExperience = loadDynamic(() => import('@/components/WelcomeExperience'),                { ssr: false })
const PageTransition    = loadDynamic(() => import('@/components/PageTransition'),                   { ssr: false })
const StarfieldBg       = loadDynamic(() => import('@/components/StarfieldBg'),                      { ssr: false })
const ClickRipple       = loadDynamic(() => import('@/components/ClickRipple'),                      { ssr: false })
const TauriTitleBar     = loadDynamic(() => import('@/components/TauriTitleBar'),                    { ssr: false })

function FallbackLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308] z-[9999]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StarfieldBg />
      <ClickRipple />
      <div className="scanline-overlay opacity-[0.03] fixed inset-0 pointer-events-none z-[99999]" />

      <TauriTitleBar />

      <AchievementToast />
      <ActivityRadar />
      <WelcomeExperience />
      <StellarOnboarding />
      <RedemptionInvite />
      <TycoonInvite />
      <ScrollToTop />

      <Suspense fallback={null}>
        <AppTrackers />
      </Suspense>

      <GardenLayout>
        <Suspense fallback={<FallbackLoader />}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </GardenLayout>
    </>
  )
}
