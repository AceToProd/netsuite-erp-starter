import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server reads its port from VITE_PORT or PORT (ace-engine injects PORT),
// defaulting to 5174. /api is proxied to the reporting gateway so the SPA uses
// a single base URL in dev.
const port = Number(process.env.VITE_PORT || process.env.PORT) || 5174;
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port,
  },
});
