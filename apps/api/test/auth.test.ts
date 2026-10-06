import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createLocalJWKSet, exportJWK, generateKeyPair, SignJWT} from 'jose';
import app from '../src/index.js';
import worker from '../src/worker.js';
import {verifyAccessIdentity} from '../src/auth.js';

const issuer = 'https://relieve-test.cloudflareaccess.com';
const environment = {DATABASE_URL: '', ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUDIENCE: 'test-audience'};

test('production fails closed and rejects local mode on public hosts', async () => {
    for (const path of ['/places', '/user/places', '/stats']) {
        assert.equal((await app.request(`https://example.com${path}`, {}, {DATABASE_URL: ''})).status, 503);
        const response = await app.request(`https://example.com${path}`, {}, {
            ...environment,
            LOCAL_DEVELOPMENT: 'true'
        });
        assert.equal(response.status, 401);
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    }
    assert.equal((await app.request('https://example.com/stats', {headers: {'Cf-Access-Authenticated-User-Email': 'spoof@example.com'}}, environment)).status, 401);
    assert.equal((await app.request('https://example.com/stats', {headers: {'Cf-Access-Jwt-Assertion': 'forged'}}, environment)).status, 401);
    assert.equal((await app.request('https://example.com/user/places/test', {
        method: 'PUT',
        headers: {Origin: 'https://attacker.com'}
    }, environment)).status, 403);
    assert.equal((await worker.fetch(new Request('https://example.com/api/stats'), environment)).status, 401);
    assert.equal((await worker.fetch(new Request('https://example.com/api/health'), environment)).status, 200);
});

test('Access identity requires correct signature, audience, issuer, lifetime and human identity', async () => {
    const {privateKey, publicKey} = await generateKeyPair('RS256');
    const keys = createLocalJWKSet({keys: [{...await exportJWK(publicKey), kid: 'test', alg: 'RS256'}]});
    const token = (overrides: { audience?: string; issuer?: string; expiry?: string; email?: string } = {}) =>
        new SignJWT({email: overrides.email ?? 'user@example.com'}).setProtectedHeader({alg: 'RS256', kid: 'test'})
            .setSubject('identity-1').setIssuedAt().setIssuer(overrides.issuer ?? issuer)
            .setAudience(overrides.audience ?? 'test-audience').setExpirationTime(overrides.expiry ?? '5m').sign(privateKey);
    assert.deepEqual(await verifyAccessIdentity(await token(), issuer, 'test-audience', keys),
        {subject: `${issuer}|identity-1`, name: 'user@example.com'});
    for (const options of [{audience: 'other'}, {issuer: 'https://other.cloudflareaccess.com'}, {expiry: '-1m'}, {email: ''}]) {
        await assert.rejects(verifyAccessIdentity(await token(options), issuer, 'test-audience', keys));
    }
    const forged = await new SignJWT({email: 'user@example.com'}).setProtectedHeader({alg: 'RS256', kid: 'test'})
        .setSubject('identity-1').setIssuedAt().setIssuer(issuer).setAudience('test-audience').setExpirationTime('5m')
        .sign((await generateKeyPair('RS256')).privateKey);
    await assert.rejects(verifyAccessIdentity(forged, issuer, 'test-audience', keys));
});
