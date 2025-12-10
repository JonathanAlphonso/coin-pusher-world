import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Suppress chunk size warning for game with three.js
    // Per Design Spec 10.4, we prioritize compatibility over bundle splitting
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunking to separate three.js from game code
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: false,  // Don't auto-open during tests
    allowedHosts: ['coinpushergame.loca.lt', '.loca.lt', '.ngrok-free.dev']
  }
});
