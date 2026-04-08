'use client'
import dynamic from 'next/dynamic'

const AuthCallback = dynamic(() => import('@/pages/AuthCallback'), { ssr: false })

export default function Page() {
  return <AuthCallback />
}
