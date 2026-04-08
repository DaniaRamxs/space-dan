'use client'
import dynamic from 'next/dynamic'

const LoginPage = dynamic(() => import('@/pages/LoginPage'), { ssr: false })

export default function LoginPageClient() {
  return <LoginPage />
}
