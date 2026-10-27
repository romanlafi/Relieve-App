import {createMiddleware} from 'hono/factory';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {createDatabase, developmentUserId, resolveAccessUser} from '@relieve/database';
import type {ApiEnvironment} from './environment.js';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

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
    if (context.env?.PUBLIC_READ_ONLY === 'true') {
        // Unregistered visitor identity: joins return no personal state, and the
        // API's public read-only guard blocks every write below.
        context.set('userId', '00000000-0000-0000-0000-000000000000');
        context.set('canEditCatalog', false);
        return next();
    }
    const hostname = new URL(context.req.url).hostname;
    if (context.env?.LOCAL_DEVELOPMENT === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
        context.set('userId', developmentUserId);
        context.set('canEditCatalog', true);
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
    context.set('userId', await resolveAccessUser(createDatabase(context.env.DATABASE_URL), subject, name));
    context.set('canEditCatalog', isCatalogEditor(name, context.env.CATALOG_EDITOR_EMAILS));
    return next();
});
