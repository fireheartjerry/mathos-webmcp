import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mathos-second-try.fireheartjerry.chatgpt.site'),
  title: 'Mathburst — the infinite math canvas',
  description: 'A live mathematical canvas for reasoning, visualization, and WebMCP-native tutoring.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Mathburst — the infinite math canvas',
    description: 'A live mathematical canvas for reasoning, visualization, and WebMCP-native tutoring.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Mathburst mathematical whiteboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mathburst — the infinite math canvas',
    description: 'A live mathematical canvas for reasoning, visualization, and WebMCP-native tutoring.',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/stix-two-text-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
