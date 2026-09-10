const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i

const isPublicPage = () =>
  typeof window !== 'undefined' && !LOCAL_HOST.test(window.location.hostname)

export const apiBase = () => {
  if (isPublicPage()) return `${window.location.origin}/hn-api`
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
}

export const wsBase = () => {
  if (isPublicPage()) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}/hn-api`
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
}
