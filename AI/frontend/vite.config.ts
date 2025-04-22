// semantix-document-search/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    allowedHosts: [
      'localhost',
      '6c4a-68-237-35-146.ngrok-free.app',
      'a456-68-237-35-146.ngrok-free.app'
    ]
  }
})