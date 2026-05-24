import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    target: 'es2015',
    // Smaller chunks = faster LCP (Core Web Vitals = SEO ranking factor)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — always needed
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          // UI / animation — split from core
          'ui-libs': ['framer-motion', 'react-icons', 'swiper'],
          // Charts — only loaded on admin pages
          'charts': ['recharts'],
          // Firebase — large, lazy-loaded
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Utilities
          'utils': ['axios', 'react-hot-toast', 'react-helmet-async'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
