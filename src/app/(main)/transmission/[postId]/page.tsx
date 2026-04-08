import TransmissionPageClient from './client'

export function generateStaticParams() {
  return [{ postId: '_' }]
}


export default function Page() {
  return <TransmissionPageClient />
}
