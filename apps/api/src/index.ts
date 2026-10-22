import {Hono} from 'hono';
import type {HealthResponse} from '@relieve/shared';
import type {ApiEnvironment} from './environment.js';
import {placesRoutes} from './handlers/places.js';
import {userPlacesRoutes} from './handlers/userPlaces.js';
import {regionsRoutes} from './handlers/regions.js';
import {statsRoutes} from './handlers/stats.js';
import {routesHandlers} from './handlers/routes.js';
import {authenticate} from './auth.js';

const app = new Hono<ApiEnvironment>();

app.onError((_error, context) => {
    return context.json({error: {code: 'INTERNAL_ERROR', message: 'Unable to process request'}}, 500);
});

app.notFound((context) => context.json({error: {code: 'NOT_FOUND', message: 'Route not found'}}, 404));

app.use('*', async (context, next) => {
    context.header('Cache-Control', 'private, no-store');
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
        if (origin && origin !== url.origin && !localProxy) {
            return context.json({error: {code: 'INVALID_ORIGIN', message: 'Cross-origin writes are not allowed'}}, 403);
        }
    }
    await next();
});
app.use('/routes/*', authenticate);
app.use('/places/*', authenticate);
app.use('/user/places/*', authenticate);
app.use('/stats/*', authenticate);
app.use('/me', authenticate);

app.route('/routes', routesHandlers);
app.route('/places', placesRoutes);
app.route('/user/places', userPlacesRoutes);
app.route('/regions', regionsRoutes);
app.route('/stats', statsRoutes);

app.get('/me', (context) => context.json({canEditCatalog: context.get('canEditCatalog')}));

app.get('/health', (c) => {
    const response: HealthResponse = {status: 'ok'};
    return c.json(response);
});

export default app;
