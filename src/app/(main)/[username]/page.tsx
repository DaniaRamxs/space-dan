import UsernamePageClient from './client'

export function generateStaticParams() {
  return [{ username: '_' }]
}


export default function Page() {
  return <UsernamePageClient />
}
