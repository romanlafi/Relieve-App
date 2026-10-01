import assert from 'node:assert/strict';
import pg from 'pg';
import {createDatabase} from '../src/client.js';
import {getPlace, listPlaces, listPlacesForUser, placesInViewport, placesNearby} from '../src/places.js';
import {listRegions} from '../src/regions.js';
import {developmentUserId} from '../src/developmentUser.js';
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
    const regionDtos = await listRegions(database);
    const aragon = regionDtos.find((region) => region.slug === 'pirineo-aragones');
    assert.ok(aragon);
    const descendants = await listPlacesForUser(database, developmentUserId, {region: aragon.slug});
    assert.ok(descendants.length >= 60);
    for (const region of regionDtos.filter((region) => region.parentId === aragon.id)) {
        const regionalPlaces = await listPlacesForUser(database, developmentUserId, {region: region.slug});
        assert.ok(regionalPlaces.length > 0);
        assert.ok(regionalPlaces.every((place) => place.regionId === region.id));
    }
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
        const plan = await pool.query<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(
            `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
            WITH RECURSIVE descendants AS (
                SELECT id FROM regions WHERE slug=$1
                UNION SELECT child.id FROM regions child JOIN descendants parent ON child.parent_id=parent.id
            ) SELECT p.id FROM places p LEFT JOIN user_places up ON up.place_id=p.id AND up.user_id=$2
            WHERE p.region_id IN (SELECT id FROM descendants) AND p.type='peak'
            AND p.location && ST_MakeEnvelope(-0.95,42.45,0.8,42.94,4326)`, [aragon.slug, developmentUserId],
        );
        const milliseconds = plan.rows[0]?.['QUERY PLAN'][0]?.['Execution Time'];
        assert.ok(milliseconds !== undefined && milliseconds < 1000);
        console.info(`Connection OK (pooled HTTP + direct PostgreSQL). ${placeDtos.length} places. Point/4326, GiST, DTO, viewport, proximity and region hierarchy checks passed. Combined query execution: ${milliseconds} ms.`);
    } finally {
        await pool.end();
    }
}

main().catch(() => {
    console.error('Database verification failed. Check connection variables, migrations and seed. No credentials logged.');
    process.exitCode = 1;
});
