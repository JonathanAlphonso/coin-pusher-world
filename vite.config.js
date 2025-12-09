import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['coinpushergame.loca.lt', '.loca.lt', '.ngrok-free.dev']
  }
});
