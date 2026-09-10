import type { NextConfig } from 'next'
import path from 'path'

const apiOrigin = (() => {
  const raw = process.env.INTERNAL_API_URL || process.env.PUBLIC_API_URL || 'http://127.0.0.1:4000'
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  return `http://${raw.replace(/\/$/, '')}`
})()

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.onrender.com',
  ],
  async rewrites() {
    return [
      { source: '/hn-api/:path*', destination: `${apiOrigin}/:path*` },
    ]
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  transpilePackages: ['@excalidraw/excalidraw'],
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }
    return config
  },
}

export default nextConfig
