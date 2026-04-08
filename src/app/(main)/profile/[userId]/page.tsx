import ProfilePageClient from './client'

export function generateStaticParams() {
  return [{ userId: '_' }]
}


export default function Page() {
  return <ProfilePageClient />
}
