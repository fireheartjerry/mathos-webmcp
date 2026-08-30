import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

const TITLE = 'Second Try — Mathos'

/**
 * Kept short enough to survive a search snippet, and true as of the current build.
 *
 * The previous one ended "...the learner owns every edit", which described the refusal
 * this page used to make and withdrew: agents may now do anything a learner can, and
 * what carries the claim is attribution rather than a permission check. A stale line in
 * `<meta name="description">` is not a cosmetic problem — it is the sentence a search
 * result, a link preview and an agent's page summary all quote, so it was asserting a
 * guarantee the code no longer makes.
 */
const DESCRIPTION =
  'A calculus scratchpad whose own algebra engine finds the first line that stopped ' +
  'being true — and hands 18 WebMCP tools to any agent, so it can verify before it teaches.'

export const metadata: Metadata = {
  // Absolute, because Open Graph consumers do not resolve relative image paths.
  metadataBase: new URL('https://mathos-second-try.fireheartjerry.chatgpt.site'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'Mathos',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        // The real page, not a mock: line 3 marked, its diagnosis, and the tool surface.
        alt: 'Line 3 of a derivation marked "Does not follow", with the diagnosis "Short of the line above by 3x²", beside a console listing 18 WebMCP tools in six groups',
      },
    ],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.png'] },
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
