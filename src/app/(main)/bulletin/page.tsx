'use client'
import dynamic from 'next/dynamic'

const BulletinPage = dynamic(() => import('@/pages/BulletinPage'), { ssr: false })

export default function Page() {
  return <BulletinPage />
}
