import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.ts'

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      // The offscreen document isn't referenced by the manifest, so add it explicitly.
      input: { offscreen: 'src/offscreen/offscreen.html' },
    },
  },
})
