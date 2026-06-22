import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // ─── Firebase Web SDK ─────────────────────────────────────────────
      // All values come from Vercel env vars / .env.local.
      // NEVER hardcode these. See .env.example for the full list.
      'import.meta.env.VITE_FIREBASE_API_KEY':              JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN':          JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID':           JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET':       JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID':  JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID':               JSON.stringify(env.VITE_FIREBASE_APP_ID),

      // ─── SEC-06 FIX ───────────────────────────────────────────────────
      // GEMINI_API_KEY has been intentionally removed from this file.
      // DO NOT re-add it here. The Gemini API must only be called
      // server-side (server.ts or server/*). If AI features are needed
      // in the frontend, proxy them through a new /api/ai/* endpoint.
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
      hmr: env.DISABLE_HMR ? false : undefined,
    },
  };
});
