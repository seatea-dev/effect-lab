import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  base: '/effect-lab/',
  plugins: [react(), tailwind()],
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'] },
})
