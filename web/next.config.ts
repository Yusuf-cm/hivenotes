import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.onrender.com',
  ],
  async rewrites() {
    // Production uses the runtime /hn-api/[...path] route so PUBLIC_API_URL
    // is read per request. Local `next dev` still rewrites to the API.
    if (process.env.NODE_ENV === 'production') return []
    return [
      { source: '/hn-api/:path*', destination: 'http://127.0.0.1:4000/:path*' },
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
