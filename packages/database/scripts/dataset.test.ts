import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadDataset, validateDataset} from './dataset.js';

const dataset = await loadDataset();

test('versioned dataset validates and covers each initial zone with all three types', () => {
    assert.ok(dataset.places.features.length >= 60);
    for (const region of dataset.regions.filter((row) => row.parentId !== null && row.slug !== 'pirineo-aragones')) {
        const types = new Set(dataset.places.features.filter((feature) => feature.properties.region === region.slug)
            .map((feature) => feature.properties.type));
        assert.deepEqual(types, new Set(['peak', 'lake', 'hut']));
    }
    assert.equal(dataset.places.features.find((feature) => feature.properties.slug === 'aneto')?.id,
        '1b00df94-28e7-4852-926c-060b9e65c87a');
});

test('curated descriptions and confirmed elevations have traceable sources', () => {
    assert.ok(dataset.places.features.every((feature) => feature.properties.elevation !== null));
    const places = new Map(dataset.places.features.map((feature) => [feature.properties.slug, feature.properties]));
    assert.equal(places.get('posets')?.elevation, 3369);
    assert.equal(places.get('pico-perdiguero')?.elevation, 3222);
    assert.equal(places.get('pico-perdiguero')?.additionalSources?.length, 2);
    assert.equal(places.get('monte-perdido')?.elevation, 3355);
    for (const slug of ['aneto', 'posets', 'monte-perdido', 'ibon-de-plan']) {
        const place = places.get(slug);
        assert.ok(place?.description);
        assert.ok(place?.additionalSources?.length);
    }
});

test('rejects invalid coordinates, types, duplicate identities and missing regions', () => {
    for (const modify of [
        (data: typeof dataset) => {
            data.places.features[0]!.geometry.coordinates = [181, 42.6];
        },
        (data: typeof dataset) => {
            data.places.features[0]!.geometry.coordinates = [0.5, -91];
        },
        (data: typeof dataset) => {
            data.places.features[0]!.geometry.coordinates = [-3, 40];
        },
        (data: typeof dataset) => {
            data.places.features[0]!.properties.region = 'unknown-region';
        },
        (data: typeof dataset) => {
            data.places.features[1]!.id = data.places.features[0]!.id;
        },
        (data: typeof dataset) => {
            data.places.features[1]!.properties.slug = data.places.features[0]!.properties.slug;
        },
    ]) {
        const invalid = structuredClone(dataset);
        modify(invalid);
        assert.throws(() => validateDataset(invalid.places, invalid.regions));
    }
    const feature = dataset.places.features[0]!;
    assert.throws(() => validateDataset({
        type: 'FeatureCollection',
        features: [{...feature, geometry: null}]
    }, dataset.regions));
    assert.throws(() => validateDataset({
        type: 'FeatureCollection', features: [{
            ...feature,
            properties: {...feature.properties, type: 'unknown'}
        }]
    }, dataset.regions));
});

test('rejects region cycles, missing parents and duplicate IDs', () => {
    const cyclic = structuredClone(dataset.regions);
    cyclic[0]!.parentId = cyclic[1]!.id;
    assert.throws(() => validateDataset(dataset.places, cyclic), /cycle/);
    const missing = structuredClone(dataset.regions);
    missing[1]!.parentId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    assert.throws(() => validateDataset(dataset.places, missing), /Unknown parent/);
    assert.throws(() => validateDataset(dataset.places, [...dataset.regions, dataset.regions[0]]), /Duplicate/);
    const unordered = validateDataset(dataset.places, [...dataset.regions].reverse());
    assert.equal(unordered.regions[0]?.slug, 'pirineos');
});
