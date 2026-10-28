import {createMiddleware} from 'hono/factory';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {createDatabase, developmentUserId, resolveAccessUser} from '@relieve/database';
import type {ApiEnvironment} from './environment.js';
import type {Context} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import {authCookies, neonAuthUrl, setAuthResponseCookies} from './neonAuth.js';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const sessionSchema = z.object({
    session: z.object({expiresAt: z.iso.datetime({offset: true})}),
    user: z.object({id: z.string().min(1), email: z.email(), name: z.string(), emailVerified: z.boolean()}),
}).nullable();

async function identifyNeonUser(context: Context<ApiEnvironment>) {
    context.set('userId', '00000000-0000-0000-0000-000000000000');
    context.set('authenticated', false);
    context.set('canEditCatalog', false);
    context.set('user', null);
    const cookie = authCookies(context.req.header('Cookie'));
    if (!cookie) return;
    try {
        const response = await fetch(neonAuthUrl(context.env.NEON_AUTH_URL!) + '/get-session?disableCookieCache=true', {
            headers: {Cookie: cookie, Origin: new URL(context.req.url).origin},
            redirect: 'manual', signal: AbortSignal.timeout(10000),
        });
        if (response.status === 401) return;
        if (!response.ok) throw new Error('Auth service unavailable');
        setAuthResponseCookies(context, response);
        const result = sessionSchema.parse(await response.json());
        if (!result || !result.user.emailVerified || Date.parse(result.session.expiresAt) <= Date.now()) return;
        const {user} = result;
        const id = await resolveAccessUser(createDatabase(context.env.DATABASE_URL),
            `neon:${neonAuthUrl(context.env.NEON_AUTH_URL!)}|${user.id}`, user.name || user.email);
        context.set('userId', id);
        context.set('authenticated', true);
        context.set('user', {id, name: user.name || user.email, email: user.email});
        context.set('canEditCatalog', isCatalogEditor(user.email, context.env.CATALOG_EDITOR_EMAILS));
    } catch {
        throw new HTTPException(503, {message: 'Authentication service unavailable'});
    }
}

export const optionalAuthentication = createMiddleware<ApiEnvironment>(async (context, next) => {
    if (!context.env?.NEON_AUTH_URL) return authenticate(context, next);
    await identifyNeonUser(context);
    return next();
});

export function isCatalogEditor(email: string, configuredEditors: string | undefined): boolean {
    const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
    return Boolean(normalizedEmail && configuredEditors?.split(',')
        .some((editor) => editor.trim().toLocaleLowerCase('en-US') === normalizedEmail));
}

export async function verifyAccessIdentity(token: string, issuer: string, audience: string,
                                           keys: Parameters<typeof jwtVerify>[1]) {
    const {payload} = await jwtVerify(token, keys, {
        issuer,
        audience,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat']
    });
    if (!payload.sub || typeof payload.email !== 'string' || !payload.email) throw new Error('Missing user identity');
    return {subject: `${issuer}|${payload.sub}`, name: payload.email};
}

export const authenticate = createMiddleware<ApiEnvironment>(async (context, next) => {
    if (context.env?.NEON_AUTH_URL) {
        await identifyNeonUser(context);
        if (!context.get('authenticated')) return context.json({error: {code: 'UNAUTHORIZED', message: 'Sign in to continue'}}, 401);
        return next();
    }
    if (context.env?.PUBLIC_READ_ONLY === 'true') {
        // Unregistered visitor identity: joins return no personal state, and the
        // API's public read-only guard blocks every write below.
        context.set('userId', '00000000-0000-0000-0000-000000000000');
        context.set('canEditCatalog', false);
        context.set('authenticated', false);
        context.set('user', null);
        return next();
    }
    const hostname = new URL(context.req.url).hostname;
    if (context.env?.LOCAL_DEVELOPMENT === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
        context.set('userId', developmentUserId);
        context.set('canEditCatalog', true);
        context.set('authenticated', true);
        context.set('user', {id: developmentUserId, name: 'Desarrollo local', email: null});
        return next();
    }
    const issuer = context.env?.ACCESS_TEAM_DOMAIN;
    const audience = context.env?.ACCESS_AUDIENCE;
    if (!issuer || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience) {
        return context.json({error: {code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured'}}, 503);
    }
    const token = context.req.header('Cf-Access-Jwt-Assertion');
    if (!token) return context.json({error: {code: 'UNAUTHORIZED', message: 'Sign in to continue'}}, 401);
    let subject: string;
    let name: string;
    try {
        let keys = keySets.get(issuer);
        if (!keys) {
            keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
            keySets.set(issuer, keys);
        }
        ({subject, name} = await verifyAccessIdentity(token, issuer, audience, keys));
    } catch {
        return context.json({error: {code: 'UNAUTHORIZED', message: 'Invalid or expired session'}}, 401);
    }
    const id = await resolveAccessUser(createDatabase(context.env.DATABASE_URL), subject, name);
    context.set('userId', id);
    context.set('authenticated', true);
    context.set('user', {id, name, email: name});
    context.set('canEditCatalog', isCatalogEditor(name, context.env.CATALOG_EDITOR_EMAILS));
    return next();
});
