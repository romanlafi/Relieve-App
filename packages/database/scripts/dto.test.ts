import assert from 'node:assert/strict';
import {test} from 'node:test';
import {toRouteSummary} from '../src/dto/route.js';
import {toUserPlace, toUserPlaceState} from '../src/dto/userPlace.js';

test('route summary converts database dates to ISO values and derives duration', () => {
    const startedAt = new Date('2026-08-12T08:10:00.000Z');
    const endedAt = new Date('2026-08-12T09:00:00.000Z');
    const createdAt = new Date('2026-08-12T09:01:00.000Z');
    const summary = toRouteSummary({
        id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', activityDate: '2026-08-12',
        distanceMeters: 1234, elevationGainMeters: 500, elevationLossMeters: 450, minElevationMeters: 2200,
        maxElevationMeters: 3404, startedAt, endedAt, createdAt, updatedAt: createdAt,
    });

    assert.equal(summary.startedAt, '2026-08-12T08:10:00.000Z');
    assert.equal(summary.endedAt, '2026-08-12T09:00:00.000Z');
    assert.equal(summary.createdAt, '2026-08-12T09:01:00.000Z');
    assert.equal(summary.durationSeconds, 3000);
    assert.equal(toRouteSummary({...{
        id: summary.id, name: summary.name, activityDate: null, distanceMeters: 1,
        elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: null, maxElevationMeters: null,
        startedAt: null, endedAt, createdAt, updatedAt: createdAt,
    }}).durationSeconds, null);
});

test('user place DTOs normalize timestamps to calendar dates and preserve null values', () => {
    const row = {
        id: '00000000-0000-4000-8000-000000000001', userId: '00000000-0000-4000-8000-000000000002',
        placeId: '00000000-0000-4000-8000-000000000003', status: 'visited' as const,
        visitedAt: new Date('2026-08-12T23:30:00.000Z'), favorite: true, notes: 'Sunny',
        createdAt: new Date('2026-08-12T00:00:00.000Z'), updatedAt: new Date('2026-08-12T00:00:00.000Z'),
    };

    assert.deepEqual(toUserPlaceState(row), {status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Sunny'});
    assert.deepEqual(toUserPlace(row), {placeId: row.placeId, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: 'Sunny'});
    assert.equal(toUserPlaceState({...row, visitedAt: null, notes: null}).visitedAt, null);
});
