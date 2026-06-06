import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          ngl: ['ngl'],
          recharts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          zustand: ['zustand'],
          supabase: ['@supabase/supabase-js'],
          sentry: ['@sentry/react'],
          mixpanel: ['mixpanel-browser'],
          qrcode: ['qrcode.react'],
          axios: ['axios'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
