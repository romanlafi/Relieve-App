import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {databaseUrl} from './environment.js';
import {loadDataset} from './dataset.js';
import {seedDataset} from './seedDataset.js';

async function main() {
    const dataset = await loadDataset();
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    try {
        await seedDataset(drizzle(pool), dataset);
        console.info(`Seed complete: ${dataset.places.features.length} places, ${dataset.regions.length} regions. Existing IDs and personal records preserved; absent places not deleted.`);
    } finally {
        await pool.end();
    }
}

main().catch(() => {
    console.error('Seed failed. Check dataset validation, UUID/slug identity conflicts, DATABASE_URL_DIRECT and migrations. No credentials logged.');
    process.exitCode = 1;
});
