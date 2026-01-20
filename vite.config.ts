import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: ['9c5999d1ad7d.ngrok-free.app'],
    // Configuração de watch para Windows (opcional, mas ajuda em alguns casos)
    watch: {
      usePolling: false, // Deixe false por padrão, mude para true se ainda houver problemas
    },
  },
  // Garantir que o Vite resolva corretamente arquivos TypeScript
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
})
