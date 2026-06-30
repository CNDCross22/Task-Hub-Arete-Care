import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// On `build` (production) the app is served from a GitHub Pages subpath
// (https://<user>.github.io/Task-Hub-Arete-Care/); on `serve` (dev) it's root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Task-Hub-Arete-Care/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
