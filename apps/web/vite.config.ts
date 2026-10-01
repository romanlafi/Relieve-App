import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {vanillaExtractPlugin} from '@vanilla-extract/vite-plugin';

export default defineConfig(({mode}) => {
    const environment = loadEnv(mode, process.cwd(), 'API_');
    const proxy = {
        '/api': {
            target: process.env.API_PROXY_TARGET ?? environment.API_PROXY_TARGET ?? 'http://127.0.0.1:8787',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
    };
    return {
        plugins: [react(), vanillaExtractPlugin()],
        server: {host: '127.0.0.1', port: 5173, strictPort: true, proxy},
        preview: {host: '127.0.0.1', proxy},
    };
});
