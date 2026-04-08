'use client'
import dynamic from 'next/dynamic'

const ProfileRedesign = dynamic(() => import('@/pages/Profile/ProfileRedesign'), { ssr: false })

export default function Page() {
  return <ProfileRedesign />
}
