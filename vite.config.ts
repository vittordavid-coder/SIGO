import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('exceljs') || id.includes('file-saver') || id.includes('xlsx') || id.includes('jspdf') || id.includes('jszip')) {
                return 'vendor-files';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
            }
            if (id.includes('src/components/')) {
              const file = id.split('src/components/')[1];
              if (file) {
                const name = file.split('/')[0].replace('.tsx', '').replace('.ts', '').toLowerCase();
                return `view-${name}`;
              }
            }
          }
        }
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
