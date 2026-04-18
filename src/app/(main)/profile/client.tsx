'use client'
import dynamic from 'next/dynamic'

const ProfileRedesign = dynamic(() => import('@/pages/Profile/ProfileRedesign'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#060d1f]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  ),
})

export default function ProfilePageClient() {
  return <ProfileRedesign />
}
