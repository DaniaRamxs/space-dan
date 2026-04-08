'use client'
import dynamic from 'next/dynamic'

const OnboardingPage = dynamic(() => import('@/pages/OnboardingPage'), { ssr: false })

export default function Page() {
  return <OnboardingPage />
}
