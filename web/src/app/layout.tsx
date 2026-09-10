import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HiveNotes',
  description: 'A written classroom notebook. Compile the hive.',
  icons: { icon: '/icon-1024.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Gochi+Hand&family=IM+Fell+English:ital@0;1&family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="tex-wood overflow-hidden">
        {process.env.PUBLIC_WS_URL ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__HN_WS__=${JSON.stringify(process.env.PUBLIC_WS_URL)};`,
            }}
          />
        ) : null}
        {children}
      </body>
    </html>
  )
}
