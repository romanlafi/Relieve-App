import assert from 'node:assert/strict';
import {test} from 'node:test';
import app from '../src/index.js';
import {placeFiltersSchema, updateCatalogPlaceSchema} from '../src/validation/places.js';

test('parses combined filters, false booleans and a complete viewport', () => {
    assert.deepEqual(placeFiltersSchema.parse({
            type: 'peak',
            region: 'valle-de-benasque',
            status: 'pending',
            favorite: 'false'
        }),
        {type: 'peak', region: 'valle-de-benasque', status: 'pending', favorite: false});
    assert.equal(placeFiltersSchema.parse({status: 'unregistered'}).status, 'unregistered');
    assert.deepEqual(placeFiltersSchema.parse({west: '-0.9', south: '42.5', east: '0.7', north: '42.9'}),
        {west: -0.9, south: 42.5, east: 0.7, north: 42.9});
});

test('rejects invalid API filters before connecting to PostgreSQL', async () => {
    for (const query of ['type=unknown', 'favorite=1', 'favorite=False', 'status=all', 'region=Invalid%20Region',
        'north=42.9', 'north=42&south=43&west=0&east=1', 'north=43&south=42&west=1&east=0',
        'north=91&south=42&west=0&east=1', 'north=&south=42&west=0&east=1', 'unknown=value']) {
        const response = await app.request(`http://localhost/places?${query}`, {}, {
            DATABASE_URL: '',
            LOCAL_DEVELOPMENT: 'true'
        });
        assert.equal(response.status, 400, query);
        const body = await response.json() as { error: { code: string } };
        assert.equal(body.error.code, 'INVALID_PLACE_FILTERS');
    }
});

test('validates catalog edits and rejects unknown fields', () => {
    const valid = {name: 'Aneto', type: 'peak', elevation: 3404, latitude: 42.63, longitude: 0.66,
        regionId: null, description: null};
    assert.deepEqual(updateCatalogPlaceSchema.parse(valid), valid);
    assert.equal(updateCatalogPlaceSchema.safeParse({...valid, elevation: 9001}).success, false);
    assert.equal(updateCatalogPlaceSchema.safeParse({...valid, latitude: Number.NaN}).success, false);
    assert.equal(updateCatalogPlaceSchema.safeParse({...valid, extra: true}).success, false);
});

test('health and invalid IDs retain their existing contracts', async () => {
    assert.deepEqual(await (await app.request('/health')).json(), {status: 'ok'});
    assert.equal((await app.request('http://localhost/places/invalid-id', {}, {
        DATABASE_URL: '',
        LOCAL_DEVELOPMENT: 'true'
    })).status, 400);
});

test('personal place and catalog endpoints reject malformed requests before database access', async () => {
    const env = {DATABASE_URL: '', LOCAL_DEVELOPMENT: 'true'};
    const id = '00000000-0000-4000-8000-000000000001';
    assert.equal((await app.request('/user/places/not-a-uuid', {}, env)).status, 400);
    assert.equal((await app.request(`/user/places/${id}/visits`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{',
    }, env)).status, 400);
    assert.equal((await app.request(`/user/places/${id}/visits`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({visitedAt: 'yesterday'}),
    }, env)).status, 400);
    assert.equal((await app.request(`/user/places/${id}/visits/not-a-uuid`, {method: 'DELETE'}, env)).status, 400);
    assert.equal((await app.request(`/user/places/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({favorite: 'yes'}),
    }, env)).status, 400);
    assert.equal((await app.request(`/places/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: '{',
    }, env)).status, 400);
    assert.equal((await app.request(`/places/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type: 'peak'}),
    }, env)).status, 400);
});
