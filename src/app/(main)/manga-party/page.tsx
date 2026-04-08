'use client'
import dynamic from 'next/dynamic'

const MangaPartyPage = dynamic(() => import('@/spacely-features/manga/MangaPartyPage'), { ssr: false })

export default function Page() {
  return <MangaPartyPage />
}
