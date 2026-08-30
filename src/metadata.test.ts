import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { metadata } from '../app/layout'

/**
 * The page's own description of itself, checked.
 *
 * This existed because nothing did. The shipped `<meta name="description">` still ended
 * "...and the learner owns every edit" — a description of the write refusal this page
 * withdrew rounds ago. That sentence is what a search result, a link preview and an
 * agent's page summary all quote, so the page was asserting a guarantee its own reducer
 * had stopped making, on every request, invisibly.
 *
 * Nothing here checks that the prose is good. It checks the two things that go wrong
 * silently: a claim the code no longer honours, and an Open Graph card that points at an
 * image that is missing or a size it is not.
 */

const OG_IMAGE = 'public/og.png'

/** PNG header: width and height are big-endian uint32 at bytes 16 and 20. */
function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path)
  expect(buffer.subarray(1, 4).toString('ascii'), `${path} is not a PNG`).toBe('PNG')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

describe('page metadata', () => {
  it('does not reassert the refusal the page withdrew', () => {
    const description = String(metadata.description)
    // The exact wording that shipped, plus the shape of the claim it made.
    expect(description).not.toMatch(/learner owns every edit/i)
    expect(description).not.toMatch(/only the learner can (write|edit|delete)/i)
  })

  it('keeps the description short enough to survive a search snippet', () => {
    const description = String(metadata.description)
    expect(description.length).toBeGreaterThan(50)
    expect(description.length).toBeLessThanOrEqual(200)
  })

  it('declares an Open Graph card whose image exists', () => {
    const images = metadata.openGraph?.images
    expect(Array.isArray(images) && images.length, 'no openGraph.images').toBeTruthy()
    const image = (images as Array<{ url: string; width: number; height: number; alt?: string }>)[0]
    expect(image.url).toBe('/og.png')
    expect(statSync(OG_IMAGE).isFile()).toBe(true)
    expect(image.alt, 'a card image with no alt text').toBeTruthy()
  })

  it('declares the dimensions the image actually has', () => {
    // Wrong numbers here are worse than none: consumers lay the card out from them
    // before the bytes arrive, so a mismatch is a card that reflows or crops.
    const image = (metadata.openGraph?.images as Array<{ width: number; height: number }>)[0]
    const actual = pngSize(OG_IMAGE)
    expect({ width: image.width, height: image.height }).toEqual(actual)
    // 1.91:1 is what Open Graph consumers crop to; 1200x630 is the canonical size.
    expect(actual).toEqual({ width: 1200, height: 630 })
  })

  it('resolves the card image absolutely, since consumers do not resolve relative paths', () => {
    expect(String(metadata.metadataBase)).toMatch(/^https:\/\//)
  })

  it('says the same thing in the card as in the description', () => {
    expect(metadata.openGraph?.description).toBe(metadata.description)
    expect(metadata.twitter?.description).toBe(metadata.description)
  })
})
