import {neon} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';
import {z} from 'zod';
import * as schema from './schema/index.js';

export function createDatabase(databaseUrl: string) {
    const validated = z.url({protocol: /^postgres(ql)?$/}).safeParse(databaseUrl);
    if (!validated.success) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
    }
    return drizzle(neon(validated.data), {schema});
}

export type Database = ReturnType<typeof createDatabase>;
