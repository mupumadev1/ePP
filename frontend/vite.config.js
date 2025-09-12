import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      tailwindcss()
  ],
    server: {
    host: '0.0.0.0',  // This binds Vite to all network interfaces, including 127.0.0.1
    port: 5173,  // Optional: Specify the port if you want to use a different one
    proxy: {
      '/users': {
        target: 'http://127.0.0.1:8000',  // Your Django backend URL
        changeOrigin: true,
        secure: false,
      },
    }
  },

})
