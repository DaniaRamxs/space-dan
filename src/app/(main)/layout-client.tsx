'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MotionConfig } from 'framer-motion'
import { AppTrackers } from './AppTrackers'

const DebugConsole      = dynamic(() => import('@/components/DebugConsole'),                     { ssr: false })
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
  // Fallback transparente — un spinner fullscreen que dura >2s en native Capacitor
  // se percibe como "se queda cargando" cuando en realidad el chunk solo tarda en
  // hidratar. Dejar el DOM vacío permite que los children aparezcan en cuanto se
  // resuelve el import, sin la sensación de que la app está colgada.
  return null
}

export default function MainLayoutClient({ children }: { children: React.ReactNode }) {
  // En Capacitor WebView, las animaciones de framer-motion con initial={{opacity:0}}
  // a veces quedan atascadas en opacity:0 y el contenido permanece invisible.
  // reducedMotion="always" hace que motion salte directo al end state — la app
  // se ve sin transiciones pero TODO el contenido es visible.
  const [forceStatic, setForceStatic] = useState(false)
  useEffect(() => {
    const w = window as any
    const isNative =
      (typeof w.Capacitor !== 'undefined' && w.Capacitor.isNativePlatform?.()) ||
      w.__TAURI_INTERNALS__ !== undefined
    if (isNative) setForceStatic(true)
  }, [])

  const content = (
    <>
      <DebugConsole />
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

  // En native, envolver con MotionConfig que skipea animaciones iniciales problemáticas.
  return forceStatic ? <MotionConfig reducedMotion="always">{content}</MotionConfig> : content
}
