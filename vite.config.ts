
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Très important : permet à l'app de fonctionner sans serveur web (mode fichier local)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
