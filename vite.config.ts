import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // GitHub Actions injects VITE_BASE=/<repo-name>/; local dev stays at '/'.
  const env = loadEnv(mode, '.', 'VITE_')

  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: { host: '0.0.0.0', port: 5173 },
    build: { target: 'es2022', cssMinify: false, chunkSizeWarningLimit: 1500 },
  }
})
