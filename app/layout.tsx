import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mathos-second-try.fireheartjerry.chatgpt.site'),
  title: 'Mathburst — the shared mathematical world',
  description: 'A live mathematical world that a learner and any WebMCP tutor can inhabit together.',
  openGraph: {
    title: 'Mathburst — the shared mathematical world',
    description: 'A photograph becomes a live mathematical world for a learner and any WebMCP tutor.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Mathburst mathematical whiteboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mathburst — the shared mathematical world',
    description: 'A photograph becomes a live mathematical world for a learner and any WebMCP tutor.',
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
