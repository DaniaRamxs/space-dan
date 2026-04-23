'use client'

import { useEffect, useState } from 'react'

const LS_KEY = '__nav_debug_log'
const MAX_ENTRIES = 30

type LogEntry = {
  t: number
  kind: string
  msg: string
}

function persistLog(kind: string, msg: string) {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const arr: LogEntry[] = raw ? JSON.parse(raw) : []
    arr.push({ t: Date.now(), kind, msg })
    while (arr.length > MAX_ENTRIES) arr.shift()
    localStorage.setItem(LS_KEY, JSON.stringify(arr))
  } catch { /* noop */ }
}

// Overlay flotante que siempre muestra los últimos logs persistidos en localStorage.
// Sobrevive a hard-navigations (a diferencia de la consola del WebView, que se
// borra cuando location.assign causa un reload completo).
function PersistentLogOverlay() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        setLogs(raw ? JSON.parse(raw) : [])
      } catch { /* noop */ }
    }
    refresh()
    const id = setInterval(refresh, 500)
    return () => clearInterval(id)
  }, [])

  const baseBtnStyle: React.CSSProperties = {
    position: 'fixed', bottom: 12, left: 12, zIndex: 2147483647,
    background: '#0ea5e9', color: '#fff',
    padding: '6px 10px', fontSize: 11, fontFamily: 'monospace',
    borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    touchAction: 'manipulation',
  }

  if (!open) {
    return (
      <button style={baseBtnStyle} onClick={() => setOpen(true)}>
        LOGS ({logs.length})
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: '10% 5% 5% 5%', zIndex: 2147483647,
      background: 'rgba(0,0,0,0.95)', color: '#e5e7eb',
      fontSize: 11, fontFamily: 'monospace',
      borderRadius: 12, border: '1px solid #0ea5e9',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: 8, display: 'flex', gap: 8, borderBottom: '1px solid #1f2937', alignItems: 'center' }}>
        <strong style={{ color: '#0ea5e9' }}>NAV LOG ({logs.length})</strong>
        <button
          style={{ marginLeft: 'auto', background: '#374151', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}
          onClick={() => { localStorage.removeItem(LS_KEY); setLogs([]) }}
        >Clear</button>
        <button
          style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}
          onClick={() => setOpen(false)}
        >X</button>
      </div>
      <div style={{ overflow: 'auto', padding: 8, flex: 1 }}>
        {logs.length === 0 ? <em style={{ color: '#6b7280' }}>(vacío)</em> : logs.map((l, i) => (
          <div key={i} style={{
            borderBottom: '1px solid #1f2937', padding: '4px 0',
            color: l.kind === 'ERR' ? '#f87171' : l.kind === 'NAV' ? '#a5f3fc' : l.kind === 'CLICK' ? '#fcd34d' : '#e5e7eb',
            wordBreak: 'break-all',
          }}>
            <span style={{ color: '#6b7280' }}>{new Date(l.t).toLocaleTimeString()}</span>
            {' '}<strong>[{l.kind}]</strong> {l.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

// Consola DevTools embebida (eruda) para debugging en APK sin chrome://inspect.
export default function DebugConsole() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const w = window as any
    const isNative =
      (typeof w.Capacitor !== 'undefined' && w.Capacitor.isNativePlatform?.()) ||
      w.__TAURI_INTERNALS__ !== undefined ||
      w.location.hostname === 'tauri.localhost' ||
      w.location.protocol === 'tauri:'

    if (!isNative) return

    persistLog('INIT', `native=${w.Capacitor?.isNativePlatform?.()} host=${w.location.hostname} href=${w.location.href}`)

    // Interceptar history API para capturar redirects del router de Next
    try {
      const origPush = history.pushState.bind(history)
      const origReplace = history.replaceState.bind(history)
      history.pushState = function (state: any, title: string, url?: string | null) {
        persistLog('HIST', `pushState → ${url} (stack: ${new Error().stack?.split('\n').slice(2, 5).join(' | ').slice(0, 200)})`)
        return origPush(state, title, url)
      }
      history.replaceState = function (state: any, title: string, url?: string | null) {
        persistLog('HIST', `replaceState → ${url} (stack: ${new Error().stack?.split('\n').slice(2, 5).join(' | ').slice(0, 200)})`)
        return origReplace(state, title, url)
      }
    } catch (err) {
      persistLog('ERR', `history patch failed: ${String(err)}`)
    }

    // Expose helper para que el shim navigate() pueda loggear
    w.__navLog = (kind: string, msg: string) => persistLog(kind, msg)

    // Listener global que captura TODOS los clicks en <a> y persiste
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null
      if (!anchor) return
      try {
        const href = anchor.getAttribute('href') || ''
        const resolved = new URL(href, w.location.href).href
        const text = (anchor.innerText || '').replace(/\s+/g, ' ').slice(0, 30)
        persistLog('CLICK', `"${text}" href=${href} → ${resolved}`)
      } catch { /* noop */ }
    }, true)

    // Capturar errores no manejados
    w.addEventListener('error', (ev: ErrorEvent) => {
      persistLog('ERR', `${ev.message} @ ${ev.filename}:${ev.lineno}`)
    })
    w.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      persistLog('ERR', `unhandled promise: ${String(ev.reason?.message || ev.reason)}`)
    })

    // Cargar eruda como secundario
    if (w.eruda) return
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js'
    script.onload = () => {
      try {
        w.eruda?.init({
          tool: ['console', 'elements', 'network', 'resources', 'info'],
          defaults: { displaySize: 50, transparency: 0.9, theme: 'Dark' },
        })
      } catch (err) {
        persistLog('ERR', `eruda init failed: ${String(err)}`)
      }
    }
    document.head.appendChild(script)
  }, [])

  return <PersistentLogOverlay />
}
