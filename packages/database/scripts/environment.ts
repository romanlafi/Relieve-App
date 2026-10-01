import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';
import {z} from 'zod';

export function databaseUrl(variable: 'DATABASE_URL' | 'DATABASE_URL_DIRECT'): string {
    try {
        loadEnvFile(resolve(process.cwd(), '../../.env'));
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            throw new Error('Unable to load local environment', {cause: error});
        }
    }
    const result = z.url({protocol: /^postgres(ql)?$/}).safeParse(process.env[variable]);
    if (!result.success) {
        throw new Error(`${variable} must be set to a PostgreSQL connection URL`);
    }
    if (variable === 'DATABASE_URL_DIRECT') {
        const directUrl = new URL(result.data);
        directUrl.searchParams.set('sslmode', 'verify-full');
        directUrl.searchParams.delete('uselibpqcompat');
        return directUrl.toString();
    }
    return result.data;
}
