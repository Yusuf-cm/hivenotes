const INTERVAL_MS = 4 * 60 * 1000

const webUrl = () =>
  process.env.CLIENT_URL || 'https://hivenotes-web.onrender.com'

const apiUrl = () =>
  process.env.KEEPALIVE_API_URL || 'https://hivenotes-server.onrender.com'

const ping = async (url: string) => {
  try {
    await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000) })
  } catch (err) {
    console.warn('[keepalive]', url, err instanceof Error ? err.message : err)
  }
}

export const startKeepAlive = () => {
  if (process.env.RENDER !== 'true') return
  if (process.env.KEEPALIVE === '0') return

  const tick = () => {
    void ping(`${apiUrl()}/health`)
    void ping(webUrl())
  }

  setTimeout(tick, 15_000)
  setInterval(tick, INTERVAL_MS)
  console.log('[keepalive] pinging every 4 minutes so Render stays awake')
}
