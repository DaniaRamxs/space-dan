import CommunityPageClient from './client'

export function generateStaticParams() {
  return [{ slug: '_' }]
}


export default function Page() {
  return <CommunityPageClient />
}
