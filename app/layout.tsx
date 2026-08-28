import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Second Try — Mathos',
  description:
    "Second Try by Mathos checks a learner's calculus derivation line by line. A WebMCP agent may explain or propose, but the page engine owns the verdict and the learner owns every edit.",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* STIX Two Text sets every word on both pages, so its fetch should not
            wait on the stylesheet that declares it. Without this the browser
            cannot start the download until globals.css is parsed and a glyph
            needs the face — measured at 761ms on Slow 4G for the transfer
            alone, against an entrance animation that finishes at 1380ms. The
            headline was animating in wearing Georgia and swapping to the real
            face mid-flight.

            Only this one. Fira Code is no longer used on the home page, so
            preloading it there would spend 36KB of the same early budget on a
            face that page never paints. /learn requests it on demand. */}
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
