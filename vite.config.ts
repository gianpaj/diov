import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Battle Circles',
        short_name: 'BattleCircles',
        description: 'A multiplayer 2D webapp game where players compete to eat each other',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'landscape',
        orientation: 'landscape',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/game': path.resolve(__dirname, './src/game'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      // Shared package — lets the frontend import from @battle-circles/shared
      // without needing the pnpm workspace to be fully installed.
      // Maps sub-path exports too: /events, /schema, /validators
      '@battle-circles/shared/events': path.resolve(__dirname, './packages/shared/src/events.ts'),
      '@battle-circles/shared/schema': path.resolve(__dirname, './packages/shared/src/schema.ts'),
      '@battle-circles/shared/validators': path.resolve(
        __dirname,
        './packages/shared/src/validators.ts'
      ),
      '@battle-circles/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['pixi.js', '@pixi/react'],
  },
})
