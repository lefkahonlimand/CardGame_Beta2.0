import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external access
    open: '/index.html', // Open dashboard by default
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true
      }
    },
    allowedHosts: ["8a93603d56e9.ngrok-free.app " , "192.168.178.33"]
  },
  root: './src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'src/frontend/index.html'),
        game: resolve(__dirname, 'src/frontend/game.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/frontend')
    }
  }
})
