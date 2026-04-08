import SpacesPageClient from './client'

export function generateStaticParams() {
  return [{ spaceId: '_' }]
}


export default function Page() {
  return <SpacesPageClient />
}
