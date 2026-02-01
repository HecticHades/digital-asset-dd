import type { Metadata } from 'next'
import { Syne, Outfit, IBM_Plex_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/providers/session-provider'
import './globals.css'

// Display font - bold, geometric, distinctive
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

// Body font - clean, modern, professional
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

// Monospace font - refined, technical, readable
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Digital Asset Due Diligence',
  description: 'Banking client onboarding tool for digital asset wealth verification',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${syne.variable} ${outfit.variable} ${ibmPlexMono.variable} font-body`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
