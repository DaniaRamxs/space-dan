import CommunityPageClient from './client'

export function generateStaticParams() {
  return [{ slug: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <CommunityPageClient />
}
