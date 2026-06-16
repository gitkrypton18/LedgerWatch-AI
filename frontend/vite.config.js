import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ✅ FIX: Proxy for local development (avoids CORS issues)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  
  // ✅ FIX: Build output directory for Vercel
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
