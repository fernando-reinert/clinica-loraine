import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',  // Verifique se o caminho base está correto
  server: {
    host: '192.168.88.34',
    port: 5173,  // A porta que o Vite usará para rodar o servidor
    allowedHosts: ['9c5999d1ad7d.ngrok-free.app'],
  },
})
