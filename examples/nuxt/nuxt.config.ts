import { fileURLToPath, URL } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/css/main.css'],
  alias: {
    '@llds/bg-dots': fileURLToPath(new URL('../../dist/index.mjs', import.meta.url)),
  },
})
