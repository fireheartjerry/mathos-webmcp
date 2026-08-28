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
      <body>{children}</body>
    </html>
  )
}
