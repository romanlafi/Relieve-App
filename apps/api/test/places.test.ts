import assert from 'node:assert/strict';
import {test} from 'node:test';
import app from '../src/index.js';
import {placeFiltersSchema} from '../src/validation/places.js';

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
        const response = await app.request(`/places?${query}`);
        assert.equal(response.status, 400, query);
        const body = await response.json() as { error: { code: string } };
        assert.equal(body.error.code, 'INVALID_PLACE_FILTERS');
    }
});

test('health and invalid IDs retain their existing contracts', async () => {
    assert.deepEqual(await (await app.request('/health')).json(), {status: 'ok'});
    assert.equal((await app.request('/places/invalid-id')).status, 400);
});
