import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
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
    }
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
