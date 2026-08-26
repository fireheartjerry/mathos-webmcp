import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      proxy: {
        '/video-api': {
          target: 'http://18.216.62.146:8001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/video-api/, ''),
        },
      },
    },
  },
})
