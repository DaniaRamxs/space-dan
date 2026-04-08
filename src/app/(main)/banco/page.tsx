'use client'
import dynamic from 'next/dynamic'

const BankPage = dynamic(() => import('@/pages/BankPage'), { ssr: false })

export default function Page() {
  return <BankPage />
}
