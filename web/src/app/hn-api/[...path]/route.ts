import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const apiOrigin = () => {
  const raw = process.env.INTERNAL_API_URL || process.env.PUBLIC_API_URL || 'http://127.0.0.1:4000'
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  return `http://${raw.replace(/\/$/, '')}`
}

const hop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params
  const dest = `${apiOrigin()}/${path.join('/')}${new URL(req.url).search}`
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (!hop.has(key.toLowerCase())) headers.set(key, value)
  })

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const res = await fetch(dest, init)
  const out = new Headers()
  res.headers.forEach((value, key) => {
    if (!hop.has(key.toLowerCase())) out.set(key, value)
  })
  return new Response(res.body, { status: res.status, headers: out })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const HEAD = proxy
export const OPTIONS = proxy
