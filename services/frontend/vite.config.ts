import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port: ace-engine injects PORT (and Caddy reverse-proxies the public host to
// it); falls back to 5174 for local dev.
const port = Number(process.env.VITE_PORT || process.env.PORT) || 5174;
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3000';

// Customer PaaS instances serve the *built* SPA via `vite preview` (see the
// frontend `command` in ace.json) — optimized assets on a single port behind
// Caddy, with /api proxied to the reporting gateway. The Vite *dev* server is
// for local development only.
//
// allowedHosts: true because every instance gets a unique generated hostname
// (e.g. netsuite-erp-<id>.<ip>.nip.io); Caddy already gates which host reaches
// this port, so a per-host allowlist here would just break every new instance.
const proxy = {
  '/api': { target: apiTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port,
    allowedHosts: true,
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port,
    allowedHosts: true,
    proxy,
  },
});
