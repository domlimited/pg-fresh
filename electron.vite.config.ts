import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@common': resolve('src/shared')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    resolve: {
      alias: {
        '@common': resolve('src/shared')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/renderer/shared'),
        '@common': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          control: resolve('src/renderer/control/index.html'),
          output: resolve('src/renderer/output/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
