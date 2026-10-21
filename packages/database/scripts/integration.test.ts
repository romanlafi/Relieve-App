import {readFile} from 'node:fs/promises';
import {parseGpx} from '../../../apps/api/src/gpx/parseGpx.js';
import {importRoute, listRoutes, getRoute, deleteRoute, nearbyRoutePlaces} from '../src/routes.js';
import {confirmVisitedPlaces} from '../src/userPlaces.js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {exportJWK, generateKeyPair, SignJWT} from 'jose';
import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {eq, sql} from 'drizzle-orm';
import app from '../../../apps/api/src/index.js';
import {createDatabase} from '../src/client.js';
import {listPlacesForUser} from '../src/places.js';
import {getPersonalStats} from '../src/stats.js';
import {resolveAccessUser} from '../src/users.js';
import {addUserPlaceVisit, deleteUserPlace, deleteUserPlaceVisit, listUserPlaceVisits, upsertUserPlace} from '../src/userPlaces.js';
import {places, userPlaces, users} from '../src/schema/index.js';
import {databaseUrl} from './environment.js';
import {loadDataset} from './dataset.js';
import {seedDataset} from './seedDataset.js';
import type {PlaceWithUserState, Region} from '@relieve/shared';

test('signed Access sessions resolve separate users throughout personal API reads and writes', async () => {
    const issuer = 'https://relieve-integration.cloudflareaccess.com';
    const audience = 'integration-audience';
    const subject = randomUUID();
    const {privateKey, publicKey} = await generateKeyPair('RS256');
    const jwk = {...await exportJWK(publicKey), kid: 'integration', alg: 'RS256'};
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        if (String(input) === `${issuer}/cdn-cgi/access/certs`) return Response.json({keys: [jwk]});
        return originalFetch(input, init);
    };
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    try {
        const token = (identity: string) => new SignJWT({email: 'temporary@example.com'})
            .setProtectedHeader({alg: 'RS256', kid: 'integration'}).setSubject(identity).setIssuer(issuer)
            .setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
        const environment = {
            DATABASE_URL: databaseUrl('DATABASE_URL'),
            ACCESS_TEAM_DOMAIN: issuer,
            ACCESS_AUDIENCE: audience
        };
        const firstToken = await token(subject);
        const secondToken = await token(`${subject}-other`);
        const headers = {'Cf-Access-Jwt-Assertion': firstToken};
        const response = await app.request('https://example.com/places', {headers}, environment);
        assert.equal(response.status, 200);
        const catalog = await response.json() as PlaceWithUserState[];
        const place = catalog[0];
        assert.ok(place);
        const saved = await app.request(`https://example.com/user/places/${place.id}`, {
            method: 'PUT',
            headers: {...headers, 'Content-Type': 'application/json'},
            body: JSON.stringify({status: 'visited'}),
        }, environment);
        assert.equal(saved.status, 200);
        const addedVisit = await app.request(`https://example.com/user/places/${place.id}/visits`, {
            method: 'POST',
            headers: {...headers, 'Content-Type': 'application/json'},
            body: JSON.stringify({visitedAt: '2026-08-12'}),
        }, environment);
        assert.equal(addedVisit.status, 200);
        const visit = await addedVisit.json() as {id: string; placeId: string; visitedAt: string};
        assert.deepEqual(visit, {id: visit.id, placeId: place.id, visitedAt: '2026-08-12'});
        const privateHistory = await app.request(`https://example.com/user/places/${place.id}/visits`,
            {headers: {'Cf-Access-Jwt-Assertion': secondToken}}, environment);
        assert.deepEqual(await privateHistory.json(), []);
        const removedVisit = await app.request(`https://example.com/user/places/${place.id}/visits/${visit.id}`, {
            method: 'DELETE', headers,
        }, environment);
        assert.equal(removedVisit.status, 204);
        const stats = await app.request('https://example.com/stats', {headers}, environment);
        assert.equal(stats.status, 200);
        assert.equal((await stats.json() as { visited: number }).visited, 1);
        const isolated = await app.request(`https://example.com/places/${place.id}`,
            {headers: {'Cf-Access-Jwt-Assertion': secondToken}}, environment);
        assert.equal(isolated.status, 200);
        assert.equal((await isolated.json() as PlaceWithUserState).userState, null);
        const gpx = await readFile(new URL('../../../apps/api/test/fixtures/aneto.gpx', import.meta.url), 'utf8');
        const body = new FormData(); body.append('file', new File([gpx], 'aneto.gpx'));
        const upload = await app.request('https://example.com/routes', {method: 'POST', headers, body}, environment);
        assert.equal(upload.status, 201);
        const route = await upload.json() as {id: string};
        const foreign = {'Cf-Access-Jwt-Assertion': secondToken};
        assert.equal((await app.request(`https://example.com/routes/${route.id}`, {headers: foreign}, environment)).status, 404);
        assert.equal((await app.request(`https://example.com/routes/${route.id}/nearby-places`, {headers: foreign}, environment)).status, 404);
        assert.equal((await app.request(`https://example.com/routes/${route.id}`, {method: 'DELETE', headers: foreign}, environment)).status, 404);
        assert.deepEqual(await (await app.request('https://example.com/routes', {headers: foreign}, environment)).json(), []);
        const detected = await app.request(`https://example.com/routes/${route.id}/nearby-places`, {headers}, environment);
        assert.equal(detected.status, 200);
        const nearby = await detected.json() as {place: {id: string}; distanceFromRoute: number}[];
        assert.ok(nearby.length > 0);
        const confirm = (ids: string[], session = headers) => app.request(`https://example.com/routes/${route.id}/confirm-places`, {
            method: 'POST', headers: {...session, 'Content-Type': 'application/json'},
            body: JSON.stringify({placeIds: ids, useActivityDate: true}),
        }, environment);
        assert.equal((await confirm([nearby[0]!.place.id], foreign)).status, 404);
        assert.equal((await confirm([randomUUID()])).status, 400);
        assert.equal((await confirm([nearby[0]!.place.id])).status, 200);
        assert.equal((await app.request(`https://example.com/routes/${route.id}`, {method: 'DELETE', headers}, environment)).status, 204);
        assert.equal((await app.request(`https://example.com/routes/${route.id}`, {headers}, environment)).status, 404);

    } finally {
        globalThis.fetch = originalFetch;
        await pool.query('DELETE FROM users WHERE access_subject = ANY($1::text[])', [[`${issuer}|${subject}`, `${issuer}|${subject}-other`]]);
        await pool.end();
    }
});

test('SQL progress handles empty history, transitions, removal and isolated Access identities', async () => {
    const database = createDatabase(databaseUrl('DATABASE_URL'));
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    const subject = `integration-${randomUUID()}`;
    const first = await resolveAccessUser(database, subject, 'Temporary stats user');
    const second = await resolveAccessUser(database, `${subject}-other`, 'Temporary isolated user');
    try {
        assert.equal(await resolveAccessUser(database, subject, 'Updated temporary name'), first);
        const catalog = await listPlacesForUser(database, first);
        const peak = catalog.filter((place) => place.type === 'peak' && place.elevation !== null)
            .sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0))[0];
        const lake = catalog.find((place) => place.type === 'lake');
        assert.ok(peak && lake);
        const empty = await getPersonalStats(database, first);
        assert.equal(empty.total, catalog.length);
        assert.equal(empty.visited, 0);
        assert.equal(empty.pending, 0);
        assert.equal(empty.highestPeak, null);
        assert.equal(empty.threeThousands.total, catalog.filter((place) => place.type === 'peak' && (place.elevation ?? 0) >= 3000).length);
        for (const row of empty.byType) assert.equal(row.total, catalog.filter((place) => place.type === row.type).length);
        await upsertUserPlace(database, first, peak.id, {status: 'visited', favorite: true});
        await upsertUserPlace(database, first, lake.id, {status: 'pending'});
        const saved = await getPersonalStats(database, first);
        assert.equal(saved.visited, 1);
        assert.equal(saved.pending, 1);
        assert.equal(saved.favorites, 1);
        assert.deepEqual(saved.highestPeak, {id: peak.id, name: peak.name, elevation: peak.elevation});
        assert.equal(saved.threeThousands.visited, (peak.elevation ?? 0) >= 3000 ? 1 : 0);
        assert.deepEqual(await getPersonalStats(database, second), empty);
        await upsertUserPlace(database, first, peak.id, {status: 'pending'});
        const pending = await getPersonalStats(database, first);
        assert.equal(pending.visited, 0);
        assert.equal(pending.pending, 2);
        assert.equal(pending.highestPeak, null);
        await deleteUserPlace(database, first, peak.id);
        await deleteUserPlace(database, first, lake.id);
        assert.deepEqual(await getPersonalStats(database, first), empty);
        const response = await app.request('/stats', {}, {
            DATABASE_URL: databaseUrl('DATABASE_URL'),
            LOCAL_DEVELOPMENT: 'true'
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json() as { total: number }).total, catalog.length);
    } finally {
        await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[first, second]]);
        await pool.end();
    }
});

test('real API combines types, region descendants, personal states and viewport', async () => {
    const environment = {DATABASE_URL: databaseUrl('DATABASE_URL'), LOCAL_DEVELOPMENT: 'true'};

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


test('PostGIS GPX metrics, segment gaps, proximity and atomic confirmations preserve personal history', async () => {
    const database = createDatabase(databaseUrl('DATABASE_URL'));
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    const user = await resolveAccessUser(database, `gpx-${randomUUID()}`, 'Temporary GPX user');
    const other = await resolveAccessUser(database, `gpx-${randomUUID()}`, 'Temporary isolated GPX user');
    try {
        const fixture = (name: string) => readFile(new URL(`../../../apps/api/test/fixtures/${name}.gpx`, import.meta.url), 'utf8');
        const route = await importRoute(database, user, parseGpx(await fixture('aneto'), 'aneto.gpx'));
        assert.equal(route.durationSeconds, 1800);
        assert.equal(route.elevationGainMeters, 14);
        assert.equal(route.elevationLossMeters, 10);
        assert.ok(route.distanceMeters > 40 && route.distanceMeters < 100);
        assert.deepEqual((await getRoute(database, user, route.id))?.geometry, route.geometry);
        assert.equal(await getRoute(database, other, route.id), undefined);
        assert.equal(await deleteRoute(database, other, route.id), false);
        assert.deepEqual(await listRoutes(database, other), []);
        const nearby = await nearbyRoutePlaces(database, user, route.id);
        const aneto = nearby.find((p) => p.place.slug === 'aneto');
        assert.ok(aneto && aneto.distanceFromRoute < 0.01);
        assert.equal(aneto.userState, null); // Import never marks places automatically.
        assert.ok(nearby.every((p) => p.distanceFromRoute <= 100));
        const segments = await importRoute(database, user, parseGpx(await fixture('segments'), 'segments.gpx'));
        assert.ok(Math.abs(segments.distanceMeters - 222.638981586) < 0.01);
        assert.equal(segments.elevationGainMeters, null);
        assert.equal((await getRoute(database, user, segments.id))?.geometry.coordinates.length, 2);
        // A point between disconnected segments must not be detected via a fabricated bridge.
        const gapId = randomUUID();
        await pool.query("INSERT INTO places (id,name,slug,type,location) VALUES ($1,'Temporary GPX gap',$2,'peak',ST_SetSRID(ST_MakePoint(0.5,0),4326))", [gapId, 'gpx-gap-' + gapId]);
        try { assert.equal((await nearbyRoutePlaces(database, user, segments.id)).some((p) => p.place.id === gapId), false); }
        finally { await pool.query('DELETE FROM places WHERE id=$1', [gapId]); }
        await confirmVisitedPlaces(database, user, [aneto.place.id], route.activityDate);
        assert.equal((await nearbyRoutePlaces(database, user, route.id)).find((p) => p.place.id === aneto.place.id)?.userState?.visitedAt, '2026-08-12');
        await upsertUserPlace(database, user, aneto.place.id, {status: 'visited', visitedAt: '2025-07-01', favorite: true, notes: 'Keep'});
        await confirmVisitedPlaces(database, user, [aneto.place.id], '2026-08-12');
        const personal = (await nearbyRoutePlaces(database, user, route.id)).find((p) => p.place.id === aneto.place.id)?.userState;
        assert.deepEqual(personal, {status: 'visited', visitedAt: '2025-07-01', favorite: true, notes: 'Keep'});
        const visits = await listUserPlaceVisits(database, user, aneto.place.id);
        assert.ok(visits);
        assert.deepEqual(visits.map((visit) => visit.visitedAt), ['2026-08-12', '2025-07-01']);
        const repeated = await addUserPlaceVisit(database, user, aneto.place.id, '2026-08-12');
        assert.equal(repeated?.id, visits[0]?.id);
        const afterDuplicate = await listUserPlaceVisits(database, user, aneto.place.id);
        assert.ok(afterDuplicate);
        assert.equal(afterDuplicate.length, 2);
        const years = (await getPersonalStats(database, user)).byYear;
        assert.deepEqual(years.map(({year, visited}) => ({year, visited})), [{year: 2026, visited: 1}, {year: 2025, visited: 1}]);
        assert.equal(await deleteUserPlaceVisit(database, user, aneto.place.id, visits[0]!.id), true);
        const remainingVisits = await listUserPlaceVisits(database, user, aneto.place.id);
        assert.ok(remainingVisits);
        assert.equal(remainingVisits[0]?.visitedAt, '2025-07-01');
        assert.equal((await getPersonalStats(database, user)).visited, 1);
        assert.equal(await deleteRoute(database, user, route.id), true);
        assert.equal(await deleteRoute(database, user, route.id), false);
        assert.equal((await getPersonalStats(database, user)).visited, 1);
        assert.equal(await getRoute(database, user, route.id), undefined);
    } finally {
        await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[user, other]]);
        await pool.end();
    }
});
