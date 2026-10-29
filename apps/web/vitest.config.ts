import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {vanillaExtractPlugin} from '@vanilla-extract/vite-plugin';

export default defineConfig({
    plugins: [react(), vanillaExtractPlugin()],
    test: {
        environment: 'jsdom',
        include: ['test/components/**/*.test.tsx'],
        setupFiles: ['./test/components/setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.css.ts', 'src/App.tsx', 'src/main.tsx'],
            reporter: ['text', 'json'],
            reportsDirectory: '../../coverage/vitest',
        },
    },
});
