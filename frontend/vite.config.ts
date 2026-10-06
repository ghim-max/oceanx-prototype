import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Prototype always runs here. strictPort stops Vite from silently moving to another port.
  server: { port: 5173, strictPort: true },
})
