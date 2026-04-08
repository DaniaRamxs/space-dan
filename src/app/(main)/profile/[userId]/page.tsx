import ProfilePageClient from './client'

export function generateStaticParams() {
  return [{ userId: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <ProfilePageClient />
}
