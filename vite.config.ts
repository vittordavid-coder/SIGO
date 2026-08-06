import { VitePWA } from 'vite-plugin-pwa';
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
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
        manifest: false // Use existing manifest.json via index.html link
      })
    ],
    base: '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), cam: path.resolve(__dirname, 'cam.html') },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('exceljs') ||
                id.includes('file-saver') ||
                id.includes('xlsx') ||
                id.includes('jspdf') ||
                id.includes('jszip') ||
                id.includes('docxtemplater') ||
                id.includes('pizzip') ||
                id.includes('html2canvas')
              ) {
                return 'vendor-files';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
            }
          }
        }
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
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
