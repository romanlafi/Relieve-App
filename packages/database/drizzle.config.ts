import {defineConfig} from 'drizzle-kit';
import {databaseUrl} from './scripts/environment.js';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/schema/index.ts',
    out: './migrations',
    dbCredentials: {url: databaseUrl('DATABASE_URL_DIRECT')},
    extensionsFilters: ['postgis'],
});
