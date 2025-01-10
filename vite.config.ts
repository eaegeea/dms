import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chakra': ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}); 