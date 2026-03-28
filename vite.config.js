import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ เปลี่ยน '/relaxation-mv-studio/' เป็นชื่อ repo ของคุณ
  base: '/relaxation-mv-studio/',
})
