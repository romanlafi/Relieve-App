import {Hono} from 'hono';
import type {HealthResponse} from '@relieve/shared';
import type {ApiEnvironment} from './environment.js';
import {placesRoutes} from './handlers/places.js';
import {userPlacesRoutes} from './handlers/userPlaces.js';

const app = new Hono<ApiEnvironment>();

app.onError((_error, context) => {
    return context.json({error: {code: 'INTERNAL_ERROR', message: 'Unable to process request'}}, 500);
});

app.notFound((context) => context.json({error: {code: 'NOT_FOUND', message: 'Route not found'}}, 404));

app.use('/places/*', async (context, next) => {
    context.header('Cache-Control', 'private, no-store');
    await next();
});
app.use('/user/places/*', async (context, next) => {
    context.header('Cache-Control', 'private, no-store');
    await next();
});

app.route('/places', placesRoutes);
app.route('/user/places', userPlacesRoutes);

app.get('/health', (c) => {
    const response: HealthResponse = {status: 'ok'};
    return c.json(response);
});

export default app;
