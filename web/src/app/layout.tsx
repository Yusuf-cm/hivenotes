import type { Metadata } from 'next'
import { Cormorant_Garamond, IM_Fell_English, Patrick_Hand, Gochi_Hand } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300','400','500','600','700'],
  style: ['normal','italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const imFell = IM_Fell_English({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal','italic'],
  variable: '--font-imfell',
  display: 'swap',
})

const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-patrick',
  display: 'swap',
})

const gochiHand = Gochi_Hand({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-gochi',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HiveNotes — The Living Manuscript',
  description: 'A real-time collaborative notebook',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${imFell.variable} ${patrickHand.variable} ${gochiHand.variable}`}>
      <body className="tex-wood overflow-hidden">
        {children}
      </body>
    </html>
  )
}