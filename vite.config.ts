import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages にデプロイする場合はリポジトリ名を指定
  // 例: base: '/OSANPOAssistant/'
  // Vercel等にデプロイする場合は '/' のままでOK
  base: '/OSANPOAssistant/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
