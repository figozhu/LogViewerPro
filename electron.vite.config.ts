import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

const sharedAlias = {
  '@shared': resolve(__dirname, 'src/shared')
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAlias
    },
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: 'src/main/index.ts'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAlias
    },
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: 'src/main/preload.ts'
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        ...sharedAlias
      }
    },
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      },
      outDir: 'dist/renderer'
    }
  }
});
