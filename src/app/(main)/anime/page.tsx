'use client'
import dynamic from 'next/dynamic'

const AnimeSpacePage = dynamic(() => import('@/spacely-features/anime/AstroPartyPage'), { ssr: false })

export default function Page() {
  return <AnimeSpacePage onClose={() => {}} roomName="" />
}
