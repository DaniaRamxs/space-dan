import GamePageClient from './client'

export function generateStaticParams() {
  return [{ gameId: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <GamePageClient />
}
