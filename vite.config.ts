import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
            https: {
                key: fs.readFileSync('./cert/localhost-key.pem'),
                cert: fs.readFileSync('./cert/localhost.pem'),
            },
            host: true,                    // スマホから LAN 経由で来るなら必須
            proxy: {
              '/socket.io': {
                target: 'http://localhost:4000',
                ws: true,                  // WebSocket upgrade。これが無いと polling 止まり
                changeOrigin: true,
              },
            },
        }
})
