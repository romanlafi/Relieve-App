import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {GpxError, MAX_GPX_BYTES, MAX_TRACK_POINTS, parseGpx} from '../src/gpx/parseGpx.js';
import app from '../src/index.js';
const fixture = (name: string) => readFile(new URL(`./fixtures/${name}.gpx`, import.meta.url), 'utf8');

test('valid GPX preserves XYZ, timestamp duration and deadband ascent/descent', async () => {
    const route = parseGpx(await fixture('aneto'), 'aneto.gpx');
    assert.equal(route.name, 'Aneto · prueba');
    assert.equal(route.geometry.coordinates[0]?.length, 4);
    assert.deepEqual(route.geometry.coordinates[0]?.[1], [0.65668611111111, 42.630991666667, 3404]);
    assert.equal(route.minElevationMeters, 3390);
    assert.equal(route.maxElevationMeters, 3404);
    assert.equal(route.elevationGainMeters, 14);
    assert.equal(route.elevationLossMeters, 10);
    assert.equal(route.activityDate, '2026-08-12');
    assert.equal(Date.parse(route.endedAt!) - Date.parse(route.startedAt!), 1800000);
    assert.equal(parseGpx(await fixture('aneto'), 'a.gpx', ' Mi recorrido ').name, 'Mi recorrido');
});
test('segments retain order and never connect gaps; absent metrics remain null', async () => {
    const route = parseGpx(await fixture('segments'), 'segments.gpx');
    assert.deepEqual(route.geometry.coordinates, [[[0,0],[0.001,0]],[[1,0],[1.001,0]]]);
    for (const value of [route.elevationGainMeters, route.elevationLossMeters, route.minElevationMeters,
        route.maxElevationMeters, route.startedAt, route.endedAt, route.activityDate]) assert.equal(value, null);
});
test('prefixed GPX namespaces work and extension namespaces cannot introduce trackpoints', () => {
    const xml = '<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1" xmlns:x="urn:extension"><g:trk><g:trkseg>'
        + '<g:trkpt lat="42" lon="0"/><x:trkpt lat="91" lon="0"/><g:trkpt lat="42.001" lon="0.001"/>'
        + '</g:trkseg></g:trk></g:gpx>';
    assert.deepEqual(parseGpx(xml, 'prefix.gpx').geometry.coordinates, [[[0,42],[0.001,42.001]]]);
});
test('partial elevation is preserved separately; incomplete or reversed times have no reliable date', async () => {
    const xml = await fixture('aneto');
    const route = parseGpx(xml.replace('<ele>3404</ele>', ''), 'a.gpx');
    assert.equal(route.elevationGainMeters, null);
    assert.equal(route.elevationLossMeters, null);
    assert.deepEqual(route.elevationSamples, [[3390,null,3403,3394]]);
    assert.equal(route.geometry.coordinates[0]?.[0]?.length, 2);
    assert.equal(parseGpx(xml.replace('<time>2026-08-12T08:10:00Z</time>', ''), 'a.gpx').activityDate, null);
    assert.equal(parseGpx(xml.replace('08:10:00Z', '07:00:00Z'), 'a.gpx').activityDate, null);
});
test('rejects malformed XML, invalid values, nontracks, DTD/entities and limits', async () => {
    const good = await fixture('segments');
    for (const xml of [await fixture('invalid'), '<gpx><trk></gpx>', '<gpx/>',
        good.replace('lat="0"', 'lat="NaN"'), good.replace('lat="0"', 'lat=""'),
        '<!DOCTYPE gpx SYSTEM "file:///etc/passwd"><gpx/>',
        '<!DOCTYPE gpx [<!ENTITY x "boom">]><gpx>&x;</gpx>', good.replace('lon="0"', 'lon="0" lon="1"'),
        good.replace('<trkseg>', '<trkseg><trkpt lat="0" lon="0"><ele>abc</ele></trkpt>'),
        '<gpx>'+ '<extensions>'.repeat(33) + '</extensions>'.repeat(33) + '</gpx>',
        '<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>',
        '<gpx><trk><trkseg>'+ '<trkpt lat="0" lon="0"/>'.repeat(MAX_TRACK_POINTS + 1) + '</trkseg></trk></gpx>',
        ' '.repeat(MAX_GPX_BYTES + 1),
    ]) assert.throws(() => parseGpx(xml, 'a.gpx'), GpxError);
    assert.throws(() => parseGpx(good, 'a.xml'), GpxError);
});
test('API rejects unauthenticated routes and malformed uploads before database access', async () => {
    const env = {DATABASE_URL: '', LOCAL_DEVELOPMENT: 'true'};
    assert.equal((await app.request('http://localhost/routes/not-a-uuid', {}, env)).status, 400);
    assert.equal((await app.request('http://localhost/routes', {method: 'POST', body: 'bad'}, env)).status, 400);
    const body = new FormData(); body.append('file', new File(['bad'], 'bad.gpx'));
    assert.equal((await app.request('http://localhost/routes', {method: 'POST', body}, env)).status, 400);
    const large = new FormData(); large.append('file', new File([' '.repeat(MAX_GPX_BYTES + 1)], 'large.gpx'));
    assert.equal((await app.request('http://localhost/routes', {method: 'POST', body: large}, env)).status, 413);
    assert.equal((await app.request('http://localhost/routes', {method: 'POST', headers: {'Content-Length': String(MAX_GPX_BYTES + 65537)}, body: 'x'}, env)).status, 413);
    assert.equal((await app.request('http://localhost/routes', {method: 'POST', headers: {'Content-Length': '1'}, body: ' '.repeat(MAX_GPX_BYTES + 65537)}, env)).status, 413);
    const secured = {DATABASE_URL: '', ACCESS_TEAM_DOMAIN: 'https://relieve.cloudflareaccess.com', ACCESS_AUDIENCE: 'a'};
    for (const path of ['/routes','/routes/00000000-0000-4000-8000-000000000002','/routes/00000000-0000-4000-8000-000000000002/nearby-places']) {
        assert.equal((await app.request(`https://example.com${path}`, {}, secured)).status, 401);
    }
});

test('route endpoints reject invalid distances and confirmations before database access', async () => {
    const env = {DATABASE_URL: '', LOCAL_DEVELOPMENT: 'true'};
    const id = '00000000-0000-4000-8000-000000000002';
    for (const distance of ['0', '-1', '501', 'abc']) {
        const response = await app.request(`http://localhost/routes/${id}/nearby-places?distance=${distance}`, {}, env);
        assert.equal(response.status, 400, distance);
        assert.equal((await response.json() as {error: {code: string}}).error.code, 'INVALID_DISTANCE');
    }

    const malformed = await app.request(`http://localhost/routes/${id}/confirm-places`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{',
    }, env);
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json() as {error: {code: string}}).error.code, 'INVALID_JSON');

    for (const body of [{placeIds: [], useActivityDate: true}, {placeIds: [id, id], useActivityDate: false}, {}]) {
        const response = await app.request(`http://localhost/routes/${id}/confirm-places`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
        }, env);
        assert.equal(response.status, 400);
        assert.equal((await response.json() as {error: {code: string}}).error.code, 'INVALID_CONFIRMATION');
    }
});

test('route upload rejects missing and duplicate form fields before parsing GPX', async () => {
    const env = {DATABASE_URL: '', LOCAL_DEVELOPMENT: 'true'};
    const absent = await app.request('http://localhost/routes', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
    }, env);
    assert.equal(absent.status, 400);
    assert.equal((await absent.json() as {error: {code: string}}).error.code, 'INVALID_UPLOAD');

    const form = new FormData();
    form.append('file', new File(['<gpx/>'], 'valid.gpx'));
    form.append('file', new File(['<gpx/>'], 'duplicate.gpx'));
    const duplicate = await app.request('http://localhost/routes', {method: 'POST', body: form}, env);
    assert.equal(duplicate.status, 400);
    assert.equal((await duplicate.json() as {error: {code: string}}).error.code, 'INVALID_UPLOAD');
});
