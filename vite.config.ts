import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

// Dev server pinned to :3000 — one of the two origins the realm's
// `customer-spa` client allowlists (the other, :3001, is the compose SPA).
//
// No dev proxy: every api module sends an absolute gateway path
// (`/{service}/v1/{audience}/...`) to the origin in VITE_API_BASE_URL, so
// there is nothing on this origin to proxy.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
})
