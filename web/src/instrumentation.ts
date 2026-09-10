export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.RENDER !== 'true') return
  if (process.env.KEEPALIVE === '0') return

  const web = process.env.KEEPALIVE_WEB_URL || 'https://hivenotes-web.onrender.com'
  const api = process.env.PUBLIC_API_URL || 'https://hivenotes-server.onrender.com'
  const ping = async (url: string) => {
    try {
      await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000) })
    } catch {
      // Render may still be waking; the next tick retries.
    }
  }
  const tick = () => {
    void ping(web)
    void ping(`${web}/hn-api/health`)
    void ping(`${api}/health`)
  }
  setTimeout(tick, 15_000)
  setInterval(tick, 4 * 60 * 1000)
  console.log('[keepalive] pinging every 4 minutes so Render stays awake')
}
