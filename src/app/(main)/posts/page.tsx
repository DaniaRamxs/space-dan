'use client'
import dynamic from 'next/dynamic'

const PostsPage = dynamic(() => import('@/pages/PostsPage'), { ssr: false })

export default function Page() {
  return <PostsPage />
}
