'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { AppTrackers } from './AppTrackers'

const GardenLayout      = dynamic(() => import('@/layouts/GardenLayout'),                        { ssr: false })
const AchievementToast  = dynamic(() => import('@/components/AchievementToast'),                 { ssr: false })
const StellarOnboarding = dynamic(() => import('@/components/Social/StellarOnboarding'),         { ssr: false })
const RedemptionInvite  = dynamic(() => import('@/components/Social/RedemptionInvite'),          { ssr: false })
const TycoonInvite      = dynamic(() => import('@/components/Social/TycoonInvite'),              { ssr: false })
const ScrollToTop       = dynamic(() => import('@/components/ScrollToTop'),                      { ssr: false })
const ActivityRadar     = dynamic(() => import('@/components/ActivityRadar'),                    { ssr: false })
const WelcomeExperience = dynamic(() => import('@/components/WelcomeExperience'),                { ssr: false })
const PageTransition    = dynamic(() => import('@/components/PageTransition'),                   { ssr: false })
const StarfieldBg       = dynamic(() => import('@/components/StarfieldBg'),                      { ssr: false })
const ClickRipple       = dynamic(() => import('@/components/ClickRipple'),                      { ssr: false })
const TauriTitleBar     = dynamic(() => import('@/components/TauriTitleBar'),                    { ssr: false })

function FallbackLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308] z-[9999]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}

export default function MainLayoutClient({ children }: { children: React.ReactNode }) {
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
