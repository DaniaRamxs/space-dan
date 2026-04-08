import SpacesPageClient from './client'

export function generateStaticParams() {
  return [{ spaceId: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <SpacesPageClient />
}
