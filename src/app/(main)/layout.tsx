'use client'
/**
 * Layout del área principal de Spacely.
 * Envuelve todas las rutas con GardenLayout (sidebar, nav, chat flotante, trackers).
 */
import { Suspense } from 'react'
import GardenLayout from '@/layouts/GardenLayout'
import AchievementToast from '@/components/AchievementToast'
import StellarOnboarding from '@/components/Social/StellarOnboarding'
import RedemptionInvite from '@/components/Social/RedemptionInvite'
import TycoonInvite from '@/components/Social/TycoonInvite'
import ScrollToTop from '@/components/ScrollToTop'
import StarfieldBg from '@/components/StarfieldBg'
import ClickRipple from '@/components/ClickRipple'
import ActivityRadar from '@/components/ActivityRadar'
import WelcomeExperience from '@/components/WelcomeExperience'
import PageTransition from '@/components/PageTransition'
import { isTauri } from '@/lib/supabase/client'
import { AppTrackers } from './AppTrackers'
import dynamic from 'next/dynamic'

const TauriTitleBar = dynamic(() => import('@/components/TauriTitleBar'), { ssr: false })

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

      {isTauri && <TauriTitleBar />}

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
