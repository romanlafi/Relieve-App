import assert from 'node:assert/strict';
import {test} from 'node:test';
import app from '../src/index.js';
import {authCookies, publicSessionCookie} from '../src/neonAuth.js';

const base = 'https://relieve.example';
const env = {DATABASE_URL: '', NEON_AUTH_URL: 'https://ep-test.neonauth.us-east-2.aws.neon.tech/neondb/auth'};
const post = (path: string, body: object, origin: string | null = base) => app.request(base + path, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...(origin ? {Origin: origin} : {})}, body: JSON.stringify(body),
}, env);

test('public visitors can inspect identity and catalog requests, but cannot access personal data or write', async () => {
    const response = await app.request(base + '/me', {}, env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {authenticated: false, user: null, canEditCatalog: false, publicReadOnly: true, authAvailable: true});
    assert.equal((await app.request(base + '/places/not-a-uuid', {}, env)).status, 400);
    for (const path of ['/stats', '/routes', '/user/places']) {
        assert.equal((await app.request(base + path, {}, env)).status, 401);
    }
    assert.equal((await post('/user/places/00000000-0000-4000-8000-000000000001', {status: 'visited'})).status, 401);
    assert.equal((await post('/auth/sign-in/email', {email: 'a@example.com', password: 'abcdefgh'}, null)).status, 403);
    assert.equal((await post('/auth/sign-in/email', {email: 'a@example.com', password: 'abcdefgh'}, 'https://other.example')).status, 403);
});

test('auth proxy only permits expected operations and fields, preserves secure cookies and does not return tokens', async () => {
    assert.equal((await post('/auth/admin/create-user', {})).status, 404);
    assert.equal((await post('/auth/sign-up/email', {email: 'a@example.com', name: 'A', password: 'abcdefgh', role: 'admin'})).status, 400);
    assert.equal((await post('/auth/email-otp/send-verification-otp', {email: 'a@example.com', type: 'sign-in'})).status, 400);
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        assert.equal(String(input), env.NEON_AUTH_URL + '/sign-in/email');
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('Origin'), base);
        assert.equal(headers.get('Cookie'), '__Secure-neonauth.session_token=opaque');
        assert.deepEqual(JSON.parse(String(init?.body)), {email: 'a@example.com', password: 'abcdefgh'});
        return Response.json({token: 'never-expose-this', user: {emailVerified: true}}, {
            headers: {'Set-Cookie': '__Secure-neonauth.session_token=signed; Domain=upstream.neon.tech; Path=/auth; HttpOnly; Secure; SameSite=None'},
        });
    };
    try {
        const response = await app.request(base + '/auth/sign-in/email', {
            method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json', Cookie: 'private=ignored; __Secure-neonauth.session_token=opaque'},
            body: JSON.stringify({email: 'A@EXAMPLE.COM', password: 'abcdefgh'}),
        }, env);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        assert.deepEqual(await response.json(), {success: true, requiresVerification: false});
        const cookie = response.headers.get('Set-Cookie')!;
        assert.ok(cookie.includes('Path=/;'));
        assert.ok(cookie.includes('SameSite=Lax'));
        assert.ok(cookie.includes('HttpOnly'));
        assert.ok(cookie.includes('Secure'));
        assert.ok(!cookie.includes('Domain='));
    } finally { globalThis.fetch = original; }
});

test('revoked, expired and unverified sessions never become authenticated and service errors fail closed', async () => {
    const original = globalThis.fetch;
    const request = () => app.request(base + '/me', {headers: {Cookie: '__Secure-neonauth.session_token=test'}}, env);
    try {
        globalThis.fetch = async () => Response.json(null);
        assert.equal((await (await request()).json()).authenticated, false);
        for (const [emailVerified, expiresAt] of [[false, new Date(Date.now() + 60000).toISOString()], [true, '2000-01-01T00:00:00.000Z']] as const) {
            globalThis.fetch = async () => Response.json({session: {expiresAt}, user: {id: 'test', name: 'Test', email: 'test@example.com', emailVerified}});
            assert.equal((await (await request()).json()).authenticated, false);
        }
        globalThis.fetch = async () => new Response('service offline', {status: 500});
        assert.equal((await request()).status, 503);
        assert.equal((await post('/auth/sign-in/email', {email: 'a@example.com', password: 'abcdefgh'})).status, 503);
    } finally { globalThis.fetch = original; }
});

test('only Neon session cookies are sent upstream and new cookies are host-only and HttpOnly', () => {
    assert.equal(authCookies('other=secret; __Secure-neon-auth.session_token=signed; cf_authorization=private'), '__Secure-neon-auth.session_token=signed');
    const cookie = publicSessionCookie('neonauth.session_token=value');
    for (const flag of ['Path=/', 'SameSite=Lax', 'HttpOnly', 'Secure']) assert.ok(cookie.includes(flag));
});
