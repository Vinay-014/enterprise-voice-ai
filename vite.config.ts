import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: {
        clientPort: 3000,
        overlay: false,
      },
      watch: {
        usePolling: true,
        ignored: ['**/app.db*', '**/backend/app.db*', '**/*.db*', '**/dist/**', '**/.git/**'],
      },
    },
  };
});
