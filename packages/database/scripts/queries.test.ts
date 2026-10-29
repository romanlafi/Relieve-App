import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Place} from '@relieve/shared';
import {fakeDatabase} from './fakeDatabase.js';
import {listPlaces, listPlacesForUser, getPlaceForUser, getPlace, placesInViewport, placesNearby, updateCatalogPlace} from '../src/places.js';
import {listRegions, regionExists} from '../src/regions.js';
import {getPersonalStats} from '../src/stats.js';
import {deleteRoute, getRoute, getRouteSummary, importRoute, listRoutes, nearbyRoutePlaces} from '../src/routes.js';
import {addUserPlaceVisit, confirmVisitedPlaces, deleteUserPlace, deleteUserPlaceVisit, getUserPlace,
    listUserPlaceVisits, listUserPlaces, upsertUserPlace} from '../src/userPlaces.js';

const place: Place = {id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: 3404, latitude: 42.6, longitude: 0.6, description: null};
const placeRow = {...place, regionId: null};
const personal = {id: 'user-place', userId: 'user', placeId: place.id, status: 'visited' as const,
    visitedAt: new Date('2026-08-12T23:00:00.000Z'), favorite: true, notes: 'Cima'};
const routeRow = {
    id: '00000000-0000-4000-8000-000000000010', name: 'Aneto', activityDate: '2026-08-12', distanceMeters: 1200,
    elevationGainMeters: 500, elevationLossMeters: 450, minElevationMeters: 2200, maxElevationMeters: 3404,
    startedAt: new Date('2026-08-12T08:00:00.000Z'), endedAt: new Date('2026-08-12T09:00:00.000Z'),
    createdAt: new Date('2026-08-12T10:00:00.000Z'), updatedAt: new Date('2026-08-12T10:00:00.000Z'),
};

test('place queries map optional personal state and handle missing records', async () => {
    const list = fakeDatabase([[{place: placeRow, personal}, {place: {...placeRow, id: 'other'}, personal: null}]]);
    assert.deepEqual(await listPlacesForUser(list.database, 'user', {
        type: 'peak', status: 'visited', favorite: true, region: 'benasque', massif: 'posets',
        elevationMin: 1000, elevationMax: 4000, west: 0, south: 42, east: 1, north: 43,
    }), [
        {...placeRow, userState: {status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Cima'}},
        {...placeRow, id: 'other', userState: null},
    ]);
    assert.deepEqual(list.calls, ['select']);

    const get = fakeDatabase([[{place: placeRow, personal}]]);
    assert.deepEqual(await getPlaceForUser(get.database, 'user', place.id), {
        ...placeRow, userState: {status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Cima'},
    });
    assert.equal(await getPlaceForUser(fakeDatabase([[]]).database, 'user', place.id), undefined);
    assert.equal((await getPlaceForUser(fakeDatabase([[{place: placeRow, personal: null}]]).database, 'user', place.id))?.userState, null);
});

test('catalog queries return records, viewport results and update outcomes', async () => {
    assert.deepEqual(await listPlaces(fakeDatabase([[place]]).database), [place]);
    assert.deepEqual(await getPlace(fakeDatabase([[place]]).database, place.id), place);
    assert.equal(await getPlace(fakeDatabase([[]]).database, place.id), undefined);
    assert.deepEqual(await placesInViewport(fakeDatabase([[place]]).database, {west: 0, south: 42, east: 1, north: 43}), [place]);
    assert.deepEqual(await placesNearby(fakeDatabase([[place]]).database, 0.6, 42.6, 100), [place]);
    const update = {name: 'Nuevo nombre', type: 'peak' as const, elevation: null, latitude: 42.6,
        longitude: 0.6, regionId: null, description: 'Cima'};
    assert.equal(await updateCatalogPlace(fakeDatabase([[{id: place.id}]]).database, place.id, update), true);
    assert.equal(await updateCatalogPlace(fakeDatabase([[]]).database, place.id, update), false);
});

test('regions are listed and existence checks distinguish missing IDs', async () => {
    const rows = [{id: place.id, name: 'Benasque', slug: 'benasque', type: 'valley', parentId: null}];
    assert.deepEqual(await listRegions(fakeDatabase([rows]).database), rows);
    assert.equal(await regionExists(fakeDatabase([[{id: place.id}]]).database, place.id), true);
    assert.equal(await regionExists(fakeDatabase([[]]).database, place.id), false);
});

test('route queries map summaries, preserve geometry, and map nearby personal state', async () => {
    const geometry = {type: 'MultiLineString' as const, coordinates: [[[0, 42], [0.1, 42.1]]]};
    assert.equal((await listRoutes(fakeDatabase([[routeRow]]).database, 'user'))[0]?.durationSeconds, 3600);
    assert.equal((await getRouteSummary(fakeDatabase([[routeRow]]).database, 'user', routeRow.id))?.name, 'Aneto');
    assert.equal(await getRouteSummary(fakeDatabase([[]]).database, 'user', routeRow.id), undefined);
    assert.deepEqual((await getRoute(fakeDatabase([[{...routeRow, geometry}]]).database, 'user', routeRow.id))?.geometry, geometry);
    assert.equal(await getRoute(fakeDatabase([[]]).database, 'user', routeRow.id), undefined);
    assert.equal(await deleteRoute(fakeDatabase([[{id: routeRow.id}]]).database, 'user', routeRow.id), true);
    assert.equal(await deleteRoute(fakeDatabase([[]]).database, 'user', routeRow.id), false);
    const nearby = await nearbyRoutePlaces(fakeDatabase([[{place, personal, distanceFromRoute: 12},
        {place, personal: null, distanceFromRoute: 50}]]).database, 'user', routeRow.id);
    assert.equal(nearby[0]?.userState?.visitedAt, '2026-08-12');
    assert.equal(nearby[1]?.userState, null);

    const imported = await importRoute(fakeDatabase([[routeRow]]).database, 'user', {
        name: 'Aneto', activityDate: null, geometry, elevationSamples: null,
        elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: null, maxElevationMeters: null,
        startedAt: null, endedAt: null,
    });
    assert.deepEqual(imported.geometry, geometry);
    await assert.rejects(importRoute(fakeDatabase([[]]).database, 'user', {
        name: 'Aneto', activityDate: null, geometry, elevationSamples: null,
        elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: null, maxElevationMeters: null,
        startedAt: null, endedAt: null,
    }), /Unable to import route/);
});

test('personal statistics aggregate totals with and without a highest peak', async () => {
    const byType = [{type: 'peak', total: 2, visited: 1, pending: 1, favorites: 1, threeTotal: 1, threeVisited: 1, highest: place.id}];
    const byRegion = {rows: [{id: place.id, name: 'Benasque', slug: 'benasque', type: 'valley', total: '2',
        visited: '1', pending: '1', favorites: '1'}]};
    const byYear = [{year: 2026, visited: 2}];
    const stats = await getPersonalStats(fakeDatabase([byType, byRegion, byYear,
        [{id: place.id, name: place.name, elevation: place.elevation}]]).database, 'user');
    assert.equal(stats.total, 2);
    assert.equal(stats.visited, 1);
    assert.equal(stats.threeThousands.total, 1);
    assert.equal(stats.byRegion[0]?.total, 2);
    assert.equal(stats.byYear[0]?.visited, 2);
    assert.deepEqual(stats.highestPeak, {id: place.id, name: 'Aneto', elevation: 3404});

    const empty = await getPersonalStats(fakeDatabase([[], {rows: []}, []]).database, 'user');
    assert.equal(empty.total, 0);
    assert.deepEqual(empty.byRegion, []);
    assert.equal(empty.highestPeak, null);
});

test('personal place queries map rows and distinguish missing catalog entries', async () => {
    assert.deepEqual(await listUserPlaces(fakeDatabase([[personal]]).database, 'user'), [{
        placeId: place.id, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Cima',
    }]);
    assert.deepEqual(await getUserPlace(fakeDatabase([[{place: placeRow, personal}]]).database, 'user', place.id), {
        placeId: place.id, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Cima',
    });
    assert.equal(await getUserPlace(fakeDatabase([[{place: placeRow, personal: null}]]).database, 'user', place.id), null);
    assert.equal(await getUserPlace(fakeDatabase([[]]).database, 'user', place.id), undefined);
    assert.deepEqual(await listUserPlaceVisits(fakeDatabase([[{place: placeRow, personal: null}], [
        {id: 'visit-1', visitedAt: '2026-08-12'},
    ]]).database, 'user', place.id), [{id: 'visit-1', placeId: place.id, visitedAt: '2026-08-12'}]);
    assert.equal(await listUserPlaceVisits(fakeDatabase([[]]).database, 'user', place.id), null);
});

test('personal place upserts validate date state and record visits when supplied', async () => {
    assert.deepEqual(await upsertUserPlace(fakeDatabase([[]]).database, 'user', place.id, {}), {kind: 'not-found'});
    assert.deepEqual(await upsertUserPlace(fakeDatabase([[{place: placeRow, personal: null}]]).database,
        'user', place.id, {visitedAt: '2026-08-12'}), {kind: 'invalid-date'});
    const savedRow = {...personal, status: 'visited' as const};
    const saved = await upsertUserPlace(fakeDatabase([
        [{place: placeRow, personal: null}], [savedRow], [],
    ]).database, 'user', place.id, {status: 'visited', visitedAt: '2026-08-12', favorite: true, notes: 'Cima'});
    assert.equal(saved.kind, 'saved');
    if (saved.kind === 'saved') {
        assert.equal(saved.value.placeId, place.id);
        assert.equal(saved.value.visitedAt, '2026-08-12');
    }
    await assert.rejects(upsertUserPlace(fakeDatabase([[{place: placeRow, personal: null}], []]).database,
        'user', place.id, {}), /Unable to save personal place/);
});

test('visit mutations add, delete, and update personal state while honoring missing rows', async () => {
    assert.equal(await addUserPlaceVisit(fakeDatabase([[]]).database, 'user', place.id, '2026-08-12'), null);
    const added = await addUserPlaceVisit(fakeDatabase([
        [{place: placeRow, personal: null}], [{id: 'user-place'}], [], [{id: 'visit-1', visitedAt: '2026-08-12'}],
    ]).database, 'user', place.id, '2026-08-12');
    assert.deepEqual(added, {id: 'visit-1', placeId: place.id, visitedAt: '2026-08-12'});
    await assert.rejects(addUserPlaceVisit(fakeDatabase([
        [{place: placeRow, personal: null}], [],
    ]).database, 'user', place.id, '2026-08-12'), /Unable to save personal place/);
    await assert.rejects(addUserPlaceVisit(fakeDatabase([
        [{place: placeRow, personal: null}], [{id: 'user-place'}], [], [],
    ]).database, 'user', place.id, '2026-08-12'), /Unable to save place visit/);

    assert.equal(await deleteUserPlaceVisit(fakeDatabase([[]]).database, 'user', place.id, 'visit-1'), false);
    assert.equal(await deleteUserPlaceVisit(fakeDatabase([
        [{id: 'visit-1', userPlaceId: 'user-place', status: 'visited'}], [], [{visitedAt: '2026-08-11'}], [],
    ]).database, 'user', place.id, 'visit-1'), true);
    assert.equal(await deleteUserPlaceVisit(fakeDatabase([
        [{id: 'visit-1', userPlaceId: 'user-place', status: 'pending'}], [], [], [],
    ]).database, 'user', place.id, 'visit-1'), true);
});

test('deleting and confirming personal places handles empty and populated writes', async () => {
    assert.equal(await deleteUserPlace(fakeDatabase([[]]).database, 'user', place.id), false);
    assert.equal(await deleteUserPlace(fakeDatabase([[{place: placeRow, personal: null}], []]).database,
        'user', place.id), true);
    assert.deepEqual(await confirmVisitedPlaces(fakeDatabase([[personal], []]).database, 'user', [place.id], '2026-08-12'), [{
        placeId: place.id, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Cima',
    }]);
    assert.deepEqual(await confirmVisitedPlaces(fakeDatabase([[]]).database, 'user', [], null), []);
});
