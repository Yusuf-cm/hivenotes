const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i

const isPublicPage = () =>
  typeof window !== 'undefined' && !LOCAL_HOST.test(window.location.hostname)

const withScheme = (value: string, ws = false) => {
  if (!value) return ''
  if (/^wss?:\/\//i.test(value) || /^https?:\/\//i.test(value)) {
    return ws ? value.replace(/^http/i, 'ws') : value
  }
  return `${ws ? 'ws' : 'http'}://${value}`
}

export const apiBase = () => {
  if (isPublicPage()) return `${window.location.origin}/hn-api`
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
}

export const wsBase = () => {
  if (typeof window !== 'undefined') {
    const injected = (window as Window & { __HN_WS__?: string }).__HN_WS__
    if (injected) return withScheme(injected, true)
  }
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL
  if (fromEnv) return withScheme(fromEnv, true)
  if (isPublicPage()) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}/hn-api`
  }
  return 'ws://localhost:4000'
}
