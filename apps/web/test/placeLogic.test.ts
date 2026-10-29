import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PlaceWithUserState} from '@relieve/shared';
import {matchesPersonalFilters, placeFiltersQuery} from '../src/map/placeFilters.js';
import {placesToGeoJson} from '../src/map/placesGeoJson.js';

const makePlace = (overrides: Partial<PlaceWithUserState> = {}): PlaceWithUserState => ({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Aneto',
    slug: 'aneto',
    type: 'peak',
    elevation: 3404,
    latitude: 42.63,
    longitude: 0.66,
    description: null,
    userState: null,
    regionId: null,
    ...overrides,
});

test('personal filters distinguish unregistered places from pending and visited places', () => {
    const unregistered = makePlace();
    const pending = makePlace({userState: {status: 'pending', favorite: false, visitedAt: null, notes: null}});
    const visitedFavorite = makePlace({userState: {status: 'visited', favorite: true, visitedAt: '2026-05-04', notes: 'Clear day'}});

    assert.equal(matchesPersonalFilters(unregistered, {}), true);
    assert.equal(matchesPersonalFilters(unregistered, {status: 'unregistered'}), true);
    assert.equal(matchesPersonalFilters(pending, {status: 'unregistered'}), false);
    assert.equal(matchesPersonalFilters(pending, {status: 'pending', favorite: false}), true);
    assert.equal(matchesPersonalFilters(pending, {favorite: true}), false);
    assert.equal(matchesPersonalFilters(visitedFavorite, {status: 'visited', favorite: true}), true);
    assert.equal(matchesPersonalFilters(visitedFavorite, {status: 'pending'}), false);
});

test('place filter query preserves false and zero while omitting unset fields', () => {
    assert.equal(placeFiltersQuery({favorite: false, elevationMin: 0, elevationMax: undefined, region: 'valle-de-benasque'}),
        'favorite=false&elevationMin=0&region=valle-de-benasque');
    assert.equal(placeFiltersQuery({}), '');
});

test('places become GeoJSON points with longitude-first coordinates and user defaults', () => {
    const features = placesToGeoJson([
        makePlace(),
        makePlace({id: '00000000-0000-4000-8000-000000000002', type: 'pass'}),
        makePlace({id: '00000000-0000-4000-8000-000000000003', type: 'lake', userState: {
            status: 'visited', favorite: true, visitedAt: '2026-05-04', notes: null,
        }}),
    ]).features;

    assert.equal(features.length, 2);
    assert.deepEqual(features[0]?.geometry.coordinates, [0.66, 42.63]);
    assert.deepEqual(features[0]?.properties, {
        id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', type: 'peak', elevation: 3404,
        status: 'unregistered', favorite: false,
    });
    assert.equal(features[1]?.properties.status, 'visited');
    assert.equal(features[1]?.properties.favorite, true);
});
