import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/

// Dynamic bridge to capture decrypted dotenvx process environments at boot
const runtimeEnvDefs = {};
for (const key in process.env) {
  if (key.startsWith('VITE_') || key.startsWith('FIREBASE_')) {
    runtimeEnvDefs[`process.env.${key}`] = JSON.stringify(process.env[key]);
    if (key.startsWith('VITE_')) {
      runtimeEnvDefs[`import.meta.env.${key}`] = JSON.stringify(process.env[key]);
    } else {
      runtimeEnvDefs[`import.meta.env.VITE_${key}`] = JSON.stringify(process.env[key]);
      runtimeEnvDefs[`process.env.VITE_${key}`] = JSON.stringify(process.env[key]);
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: { ...runtimeEnvDefs },
  plugins: [react(), tailwindcss()],
    server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    },
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
