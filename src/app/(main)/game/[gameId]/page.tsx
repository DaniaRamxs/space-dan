import GamePageClient from './client'

export function generateStaticParams() {
  return [{ gameId: '_' }]
}


export default function Page() {
  return <GamePageClient />
}
