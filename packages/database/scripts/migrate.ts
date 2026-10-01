import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {databaseUrl} from './environment.js';

async function main() {
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    try {
        await migrate(drizzle(pool), {migrationsFolder: './migrations'});
        console.info('Migrations applied successfully.');
    } finally {
        await pool.end();
    }
}

main().catch(() => {
    console.error('Migration failed. Check DATABASE_URL_DIRECT, connectivity and database permissions. No credentials logged.');
    process.exitCode = 1;
});
