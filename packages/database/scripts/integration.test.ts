import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {eq, sql} from 'drizzle-orm';
import app from '../../../apps/api/src/index.js';
import {createDatabase} from '../src/client.js';
import {listPlacesForUser} from '../src/places.js';
import {places, userPlaces, users} from '../src/schema/index.js';
import {databaseUrl} from './environment.js';
import {loadDataset} from './dataset.js';
import {seedDataset} from './seedDataset.js';
import type {PlaceWithUserState, Region} from '@relieve/shared';

test('real API combines types, region descendants, personal states and viewport', async () => {
    const environment = {DATABASE_URL: databaseUrl('DATABASE_URL')};

    async function request(query: string): Promise<PlaceWithUserState[]> {
        const response = await app.request(`/places${query ? '?' + query : ''}`, {}, environment);
        assert.equal(response.status, 200);
        return await response.json() as PlaceWithUserState[];
    }

    const all = await request('');
    const regionResponse = await app.request('/regions', {}, environment);
    assert.equal(regionResponse.status, 200);
    const regions = await regionResponse.json() as Region[];
    const ids = (rows: PlaceWithUserState[]) => rows.map((place) => place.id).sort();
    for (const type of ['peak', 'lake', 'hut']) {
        assert.deepEqual(ids(await request('type=' + type)), ids(all.filter((place) => place.type === type)));
    }
    for (const region of regions) {
        const descendants = new Set([region.id]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const child of regions) {
                if (child.parentId && descendants.has(child.parentId) && !descendants.has(child.id)) {
                    descendants.add(child.id);
                    changed = true;
                }
            }
        }
        const expected = all.filter((place) => place.regionId !== null && descendants.has(place.regionId));
        assert.deepEqual(ids(await request('region=' + region.slug)), ids(expected));
        assert.deepEqual(ids(await request('region=' + region.slug + '&type=peak&status=unregistered')),
            ids(expected.filter((place) => place.type === 'peak' && place.userState === null)));
    }
    for (const status of ['pending', 'visited', 'unregistered']) {
        assert.deepEqual(ids(await request('status=' + status)),
            ids(all.filter((place) => status === 'unregistered' ? place.userState === null : place.userState?.status === status)));
    }
    assert.deepEqual(ids(await request('favorite=true')), ids(all.filter((place) => place.userState?.favorite === true)));
    assert.deepEqual(ids(await request('favorite=false')), ids(all.filter((place) => place.userState?.favorite === false)));
    assert.deepEqual(ids(await request('region=does-not-exist')), []);
    assert.deepEqual(ids(await request('north=42.64&south=42.63&west=0.65&east=0.66&type=peak')),
        ids(all.filter((place) => place.type === 'peak' && place.latitude >= 42.63 && place.latitude <= 42.64
            && place.longitude >= 0.65 && place.longitude <= 0.66)));
});

test('personal filters have positive matches and distinguish absence without touching the development user', async () => {
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    const userId = randomUUID();
    try {
        const database = createDatabase(databaseUrl('DATABASE_URL'));
        const all = await listPlacesForUser(database, userId);
        const first = all.find((place) => place.type === 'peak');
        const second = all.find((place) => place.type === 'lake');
        assert.ok(first && second);
        await pool.query('INSERT INTO users (id,name) VALUES ($1,$2)', [userId, 'Temporary filter verification']);
        await pool.query("INSERT INTO user_places (user_id,place_id,status,favorite) VALUES ($1,$2,'pending',true),($1,$3,'visited',false)",
            [userId, first.id, second.id]);
        assert.deepEqual((await listPlacesForUser(database, userId, {status: 'pending', favorite: true, type: 'peak'}))
            .map((place) => place.id), [first.id]);
        assert.deepEqual((await listPlacesForUser(database, userId, {status: 'visited'})).map((place) => place.id), [second.id]);
        assert.equal((await listPlacesForUser(database, userId, {status: 'unregistered'})).length, all.length - 2);
        assert.deepEqual(await listPlacesForUser(database, userId, {status: 'pending', type: 'lake'}), []);
    } finally {
        await pool.query('DELETE FROM users WHERE id=$1', [userId]);
        await pool.end();
    }
});

test('repeated seed preserves IDs, all personal rows and places absent from the dataset (rolled back)', async () => {
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    const rollback = new Error('Verification rollback');
    try {
        const dataset = await loadDataset();
        await assert.rejects(drizzle(pool).transaction(async (transaction) => {
            const userId = randomUUID();
            const absentId = randomUUID();
            await transaction.insert(users).values({id: userId, name: 'Temporary seed verification'});
            await transaction.insert(places).values({
                id: absentId,
                name: 'Temporary conservative seed check',
                slug: 'temporary-check-' + absentId,
                type: 'peak',
                location: sql`ST_SetSRID(ST_MakePoint(0.5,42.6),4326)`
            });
            await transaction.insert(userPlaces).values({
                userId, placeId: dataset.places.features[0]!.id,
                status: 'visited', favorite: true, notes: 'Temporary transaction-only state'
            });
            const personalBefore = await transaction.select().from(userPlaces).orderBy(userPlaces.id);
            const idsBefore = await transaction.select({id: places.id}).from(places).orderBy(places.id);
            await seedDataset(transaction, dataset);
            await seedDataset(transaction, dataset);
            assert.deepEqual(await transaction.select({id: places.id}).from(places).orderBy(places.id), idsBefore);
            assert.deepEqual(await transaction.select().from(userPlaces).orderBy(userPlaces.id), personalBefore);
            assert.equal((await transaction.select().from(places).where(eq(places.id, absentId))).length, 1);
            throw rollback;
        }), (error: unknown) => error === rollback);
    } finally {
        await pool.end();
    }
});
