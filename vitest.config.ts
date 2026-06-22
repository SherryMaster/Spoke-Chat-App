import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    alias: { '@': path.resolve(here, './src') },
  },
  resolve: {
    alias: { '@': path.resolve(here, './src') },
  },
})
