import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@worker': resolve(__dirname, 'src/worker'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts']
  }
});
