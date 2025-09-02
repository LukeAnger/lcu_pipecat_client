// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/connect': {
        target: 'http://127.0.0.1:7860', // your FastAPI server
        changeOrigin: true,
      },
    },
  },
});
