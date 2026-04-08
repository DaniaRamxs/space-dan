import TransmissionPageClient from './client'

export function generateStaticParams() {
  return [{ postId: '_' }]
}

export const dynamicParams = false

export default function Page() {
  return <TransmissionPageClient />
}
