import UsernamePageClient from './client'

export function generateStaticParams() {
  return [{ username: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <UsernamePageClient />
}
