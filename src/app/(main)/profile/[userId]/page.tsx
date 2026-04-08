'use client'
import dynamic from 'next/dynamic'

const ProfileRedesign = dynamic(() => import('@/pages/Profile/ProfileRedesign'), { ssr: false })

export default function Page(_props: { params?: any }) {
  return <ProfileRedesign />
}
