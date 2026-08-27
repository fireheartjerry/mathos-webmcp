import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

// No dev proxy. The previous build forwarded /video-api/* to a bare IP over plain
// HTTP, which exposed internal infrastructure from a public repository and made the
// demo depend on a private service. The judged path is now entirely local.
export default defineConfig({
  integrations: [react()],
})
