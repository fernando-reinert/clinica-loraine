import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0', // Permite acesso de qualquer interface de rede
    port: 5173,
    strictPort: false, // Tenta outra porta se 5173 estiver ocupada
    allowedHosts: ['9c5999d1ad7d.ngrok-free.app'],
  },
})
