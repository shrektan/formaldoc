import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
