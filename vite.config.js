import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_URL || env.VITE_API_URL || 'http://127.0.0.1:5000';

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      // WebXR apps intentionally ship a larger 3D vendor chunk; keep the warning
      // high enough to avoid noise while still flagging real regressions.
      chunkSizeWarningLimit: 800,
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('/node_modules/three/examples/')) {
              return 'three-examples';
            }

            if (id.includes('/node_modules/three/')) {
              return 'three';
            }

            if (id.includes('/node_modules/@react-three/fiber')) {
              return 'fiber';
            }

            if (id.includes('/node_modules/@react-three/drei')) {
              return 'drei';
            }

            if (id.includes('/node_modules/@react-three/xr')) {
              return 'xr';
            }

            if (id.includes('/node_modules/react-router-dom')) {
              return 'router';
            }

            if (id.includes('/node_modules/framer-motion')) {
              return 'motion';
            }

            if (id.includes('/node_modules/recharts')) {
              return 'charts';
            }

            if (id.includes('/node_modules/socket.io-client')) {
              return 'sockets';
            }

            if (id.includes('/node_modules/lucide-react')) {
              return 'icons';
            }

            if (id.includes('/node_modules/react-dom') || id.includes('/node_modules/react/')) {
              return 'react';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    // Ensure proper base path for production
    base: '/',
  };
});
