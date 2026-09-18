import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/renderer',
  base: './', // file:// 协议加载
  plugins: [react()],
  build: {
    outDir: '../../dist-renderer',
    emptyOutDir: true,
    target: 'chrome130',
  },
});
