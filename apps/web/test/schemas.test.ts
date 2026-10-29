import assert from 'node:assert/strict';
import {test} from 'node:test';
import {placesSchema, placeVisitsSchema, userPlaceSchema} from '../src/map/placeSchemas.js';
import {nearbyPlacesSchema, routeDetailSchema, routeSummarySchema} from '../src/routes/routeSchemas.js';

const id = '00000000-0000-4000-8000-000000000001';
const route = {
    id, name: 'Aneto', activityDate: '2026-08-12', distanceMeters: 1200,
    elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: 2500, maxElevationMeters: 2800,
    startedAt: '2026-08-12T08:00:00.000Z', endedAt: '2026-08-12T09:00:00.000Z', durationSeconds: 3600,
    createdAt: '2026-08-12T10:00:00.000Z', updatedAt: '2026-08-12T10:00:00.000Z',
};

test('route schemas accept valid nullable summaries and multi-segment details', () => {
    assert.equal(routeSummarySchema.parse({...route, activityDate: null, startedAt: null, endedAt: null, durationSeconds: null}).activityDate, null);
    assert.deepEqual(routeDetailSchema.parse({...route, geometry: {
        type: 'MultiLineString', coordinates: [[[0.66, 42.63], [0.67, 42.64, 2700]], [[0.7, 42.7], [0.71, 42.71]]],
    }}).geometry.coordinates.length, 2);
    assert.equal(routeSummarySchema.safeParse({...route, distanceMeters: -1}).success, false);
    assert.equal(routeDetailSchema.safeParse({...route, geometry: {type: 'LineString', coordinates: []}}).success, false);
    assert.equal(routeDetailSchema.safeParse({...route, geometry: {type: 'MultiLineString', coordinates: [[[0, 0]]]}}).success, false);
});

test('place schemas validate API ranges, nullable user state and visit dates', () => {
    const place = {id, name: 'Aneto', slug: 'aneto', type: 'peak', elevation: null,
        latitude: 42.63, longitude: 0.66, description: null, userState: null, regionId: null};
    assert.equal(placesSchema.parse([place]).length, 1);
    assert.equal(placesSchema.safeParse([{...place, latitude: 91}]).success, false);
    assert.equal(placesSchema.safeParse([{...place, type: 'unknown'}]).success, false);
    assert.equal(userPlaceSchema.safeParse({placeId: id, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: null}).success, true);
    assert.equal(userPlaceSchema.safeParse({placeId: id, status: 'pending', favorite: false, visitedAt: 'yesterday', notes: null}).success, false);
    assert.equal(placeVisitsSchema.safeParse([{id, placeId: id, visitedAt: '2026-08-12'}]).success, true);
});

test('nearby place schema checks geographic bounds and nonnegative route distance', () => {
    const nearby = {place: {id, name: 'Aneto', slug: 'aneto', type: 'peak', elevation: 3404,
        longitude: 0.66, latitude: 42.63, description: null}, distanceFromRoute: 0, userState: null};
    assert.equal(nearbyPlacesSchema.parse([nearby]).length, 1);
    assert.equal(nearbyPlacesSchema.safeParse([{...nearby, distanceFromRoute: -1}]).success, false);
    assert.equal(nearbyPlacesSchema.safeParse([{...nearby, place: {...nearby.place, longitude: 181}}]).success, false);
});
