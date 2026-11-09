import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// One id per build: the service worker is registered as sw.js?v=<id>, so every deploy installs a fresh
// worker that precaches that build's files and deletes the previous build's cache.
const BUILD_ID = Date.now().toString(36)

/** Writes precache.json: every built file, so the app opens offline even on routes not yet visited. */
function precacheList(): Plugin {
  return {
    name: 'precache-list',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html')
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify({ version: BUILD_ID, files }) })
    },
  }
}

// base './' + hash routing so the build runs from any static host or folder.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), precacheList()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { chunkSizeWarningLimit: 500 },
  // Unit tests only; the browser tests in e2e/ run with Playwright.
  test: { include: ['src/**/*.test.ts'] },
})
