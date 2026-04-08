'use client'
import dynamic from 'next/dynamic'

const GalacticStore = dynamic(() => import('@/pages/GalacticStore'), { ssr: false })

export default function TiendaGalacticaPageClient() {
  return <GalacticStore />
}
