import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/cv': 'http://localhost:8000',
      '/jobs': 'http://localhost:8000',
      '/agents': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/docs': 'http://localhost:8000',
      '/openapi.json': 'http://localhost:8000',
    },
  },
})

