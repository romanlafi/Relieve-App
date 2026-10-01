import assert from 'node:assert/strict';
import pg from 'pg';
import {createDatabase} from '../src/client.js';
import {getPlace, listPlaces, placesInViewport, placesNearby} from '../src/places.js';
import {databaseUrl} from './environment.js';

async function main() {
    const database = createDatabase(databaseUrl('DATABASE_URL'));
    const placeDtos = await listPlaces(database);
    const aneto = placeDtos.find((place) => place.slug === 'aneto');
    assert.ok(aneto);
    assert.equal(aneto.elevation, 3404);
    assert.ok(Math.abs(aneto.latitude - 42.630991666667) < 1e-10);
    assert.ok(Math.abs(aneto.longitude - 0.65668611111111) < 1e-10);
    assert.deepEqual(await getPlace(database, aneto.id), aneto);
    assert.deepEqual(await placesNearby(database, aneto.longitude, aneto.latitude, 100), [aneto]);
    assert.deepEqual(await placesInViewport(database, {west: 0.65, south: 42.63, east: 0.66, north: 42.64}), [aneto]);
    assert.deepEqual(await placesInViewport(database, {west: -5, south: 0, east: -4, north: 1}), []);
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    try {
        const result = await pool.query<{ type: string; srid: number }>(
            "SELECT type, srid FROM geometry_columns WHERE f_table_name = 'places' AND f_geometry_column = 'location'",
        );
        assert.equal(result.rows[0]?.type, 'POINT');
        assert.equal(result.rows[0]?.srid, 4326);
        const indexes = await pool.query<{ indexname: string }>(
            "SELECT indexname FROM pg_indexes WHERE tablename = 'places' AND indexdef LIKE '%USING gist%'",
        );
        assert.ok(indexes.rows.some((row) => row.indexname === 'places_location_gist_idx'));
        assert.ok(indexes.rows.some((row) => row.indexname === 'places_location_geography_gist_idx'));
        const triggers = await pool.query<{ count: string }>(
            "SELECT count(*) FROM information_schema.triggers WHERE trigger_name IN ('places_updated_at', 'regions_updated_at', 'users_updated_at', 'user_places_updated_at')",
        );
        assert.equal(triggers.rows[0]?.count, '4');
        const developmentUser = await pool.query<{ name: string }>(
            'SELECT name FROM users WHERE id = $1', ['00000000-0000-4000-8000-000000000001'],
        );
        assert.equal(developmentUser.rows[0]?.name, 'Usuario de desarrollo');
        console.info(`Connection OK (pooled HTTP + direct PostgreSQL). ${placeDtos.length} places. Point/4326, GiST, DTO, viewport and proximity checks passed.`);
    } finally {
        await pool.end();
    }
}

main().catch(() => {
    console.error('Database verification failed. Check connection variables, migrations and seed. No credentials logged.');
    process.exitCode = 1;
});
