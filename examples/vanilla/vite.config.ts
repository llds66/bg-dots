import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@llds/bg-dots': fileURLToPath(new URL('../../dist/index.mjs', import.meta.url)),
    },
  },
})
