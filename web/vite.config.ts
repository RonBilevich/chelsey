import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server is exposed on the local network (host: true) so ACE can open it on
// his phone. API calls are proxied to the backend so the web app talks to one
// origin and never sees the API keys.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
