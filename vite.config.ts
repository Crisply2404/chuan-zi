import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { '/ws': { target: 'ws://127.0.0.1:8787', ws: true, headers: { origin: 'http://localhost:5173' } } } },
  preview: { proxy: { '/ws': { target: 'ws://127.0.0.1:8787', ws: true, headers: { origin: 'http://localhost:4173' } } } },
  build: { target: 'es2022' },
});
