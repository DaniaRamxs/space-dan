import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import { Providers } from '@/app/providers'

// App.getInitialProps disables automatic static optimization for ALL pages
// preventing build-time prerendering of client-only components
function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Prevent any server-side render — these pages are client-only
  if (!mounted) return null

  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  )
}

App.getInitialProps = async () => ({ pageProps: {} })

export default App
