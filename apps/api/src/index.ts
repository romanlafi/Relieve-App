import {Hono} from 'hono';
import type {HealthResponse} from '@relieve/shared';
import type {ApiEnvironment} from './environment.js';
import {placesRoutes} from './handlers/places.js';
import {userPlacesRoutes} from './handlers/userPlaces.js';
import {regionsRoutes} from './handlers/regions.js';
import {statsRoutes} from './handlers/stats.js';
import {routesHandlers} from './handlers/routes.js';
import {authenticate, optionalAuthentication} from './auth.js';
import {authRoutes} from './neonAuth.js';
import {HTTPException} from 'hono/http-exception';

const app = new Hono<ApiEnvironment>();

app.onError((_error, context) => {
    if (_error instanceof HTTPException) {
        if (_error.status !== 503) return _error.getResponse();
        return context.json({error: {code: 'AUTH_UNAVAILABLE', message: 'Authentication service unavailable'}}, 503);
    }
    return context.json({error: {code: 'INTERNAL_ERROR', message: 'Unable to process request'}}, 500);
});

app.notFound((context) => context.json({error: {code: 'NOT_FOUND', message: 'Route not found'}}, 404));

app.use('*', async (context, next) => {
    context.header('Cache-Control', 'private, no-store');
    if (!context.env?.NEON_AUTH_URL && context.env?.PUBLIC_READ_ONLY === 'true'
        && !['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) {
        return context.json({error: {code: 'READ_ONLY', message: 'This public portfolio is read-only'}}, 403);
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) {
        const origin = context.req.header('Origin');
        const url = new URL(context.req.url);
        let originUrl: URL | undefined;
        try {
            originUrl = origin ? new URL(origin) : undefined;
        } catch { /* Invalid origins are rejected below. */
        }
        const localProxy = context.env?.LOCAL_DEVELOPMENT === 'true'
            && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
            && originUrl?.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(originUrl.hostname);
        if ((context.env?.NEON_AUTH_URL && !origin) || (origin && origin !== url.origin && !localProxy)) {
            return context.json({error: {code: 'INVALID_ORIGIN', message: 'Cross-origin writes are not allowed'}}, 403);
        }
    }
    await next();
});
app.use('/routes/*', authenticate);
app.use('/places/*', (context, next) => ['GET', 'HEAD'].includes(context.req.method)
    ? optionalAuthentication(context, next) : authenticate(context, next));
app.use('/user/places/*', authenticate);
app.use('/stats/*', authenticate);
app.use('/me', optionalAuthentication);

app.route('/auth', authRoutes);
app.route('/routes', routesHandlers);
app.route('/places', placesRoutes);
app.route('/user/places', userPlacesRoutes);
app.route('/regions', regionsRoutes);
app.route('/stats', statsRoutes);

app.get('/me', (context) => context.json({
    canEditCatalog: context.get('canEditCatalog'),
    publicReadOnly: !context.get('authenticated'),
    authenticated: context.get('authenticated') ?? false,
    user: context.get('user') ?? null,
    authAvailable: Boolean(context.env?.NEON_AUTH_URL),
}));

app.get('/health', (c) => {
    const response: HealthResponse = {status: 'ok'};
    return c.json(response);
});

export default app;
