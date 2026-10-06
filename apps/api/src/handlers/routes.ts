import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {confirmVisitedPlaces, createDatabase, deleteRoute, getRoute, getRouteSummary, importRoute, listRoutes, nearbyRoutePlaces} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';
import type {RouteImport} from '@relieve/shared';
import {GpxError, MAX_GPX_BYTES, parseGpx} from '../gpx/parseGpx.js';
import {confirmRoutePlacesSchema, proximitySchema, routeIdSchema, routeNameSchema} from '../validation/routes.js';

export const routesHandlers = new Hono<ApiEnvironment>();
const missing = {error: {code: 'ROUTE_NOT_FOUND', message: 'Route not found'}};
// Always count actual bytes, even if the supplied Content-Length is understated.
routesHandlers.use('*', async (c, next) => {
    const declared = Number(c.req.header('Content-Length'));
    if (c.req.raw.body && (!Number.isFinite(declared) || declared <= MAX_GPX_BYTES + 64 * 1024)) {
        const headers = new Headers(c.req.raw.headers);
        headers.delete('Content-Length');
        c.req.raw = new Request(c.req.raw, {headers});
    }
    await next();
});
routesHandlers.use('*', bodyLimit({maxSize: MAX_GPX_BYTES + 64 * 1024,
    onError: (c) => c.json({error: {code: 'FILE_TOO_LARGE', message: 'El archivo supera el límite de 5 MiB.'}}, 413)}));
routesHandlers.use('/:id/*', async (c, next) => {
    if (!routeIdSchema.safeParse(c.req.param('id')).success) {
        return c.json({error: {code: 'INVALID_ROUTE_ID', message: 'Route ID must be a UUID'}}, 400);
    }
    await next();
});
routesHandlers.get('/', async (c) => c.json(await listRoutes(createDatabase(c.env.DATABASE_URL), c.get('userId'))));
routesHandlers.post('/', async (c) => {
    let form: FormData;
    try { form = await c.req.raw.formData(); }
    catch { return c.json({error: {code: 'INVALID_UPLOAD', message: 'Utiliza multipart/form-data con un archivo GPX.'}}, 400); }
    const file = form.get('file');
    const name = routeNameSchema.safeParse(form.get('name') ?? undefined);
    if (!(file instanceof File) || !name.success || form.getAll('file').length !== 1 || form.getAll('name').length > 1) {
        return c.json({error: {code: 'INVALID_UPLOAD', message: 'Selecciona un GPX y un nombre de hasta 200 caracteres.'}}, 400);
    }
    if (file.size > MAX_GPX_BYTES) return c.json({error: {code: 'FILE_TOO_LARGE', message: 'El GPX supera los 5 MiB.'}}, 413);
    let input: RouteImport;
    try {
        const xml = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
        input = parseGpx(xml, file.name, name.data);
    } catch (error) {
        if (error instanceof GpxError || error instanceof TypeError) {
            return c.json({error: {code: 'INVALID_GPX', message: error instanceof GpxError ? error.message : 'El GPX debe estar codificado en UTF-8.'}}, 400);
        }
        throw error;
    }
    return c.json(await importRoute(createDatabase(c.env.DATABASE_URL), c.get('userId'), input), 201);
});
routesHandlers.get('/:id', async (c) => {
    const route = await getRoute(createDatabase(c.env.DATABASE_URL), c.get('userId'), c.req.param('id'));
    return route ? c.json(route) : c.json(missing, 404);
});
routesHandlers.delete('/:id', async (c) => {
    const removed = await deleteRoute(createDatabase(c.env.DATABASE_URL), c.get('userId'), c.req.param('id'));
    return removed ? c.body(null, 204) : c.json(missing, 404);
});
routesHandlers.get('/:id/nearby-places', async (c) => {
    const radius = proximitySchema.safeParse(c.req.query('distance'));
    if (!radius.success) return c.json({error: {code: 'INVALID_DISTANCE', message: 'Distance must be between 1 and 500 meters'}}, 400);
    const database = createDatabase(c.env.DATABASE_URL);
    const userId = c.get('userId');
    const id = c.req.param('id');
    if (!await getRouteSummary(database, userId, id)) return c.json(missing, 404);
    return c.json(await nearbyRoutePlaces(database, userId, id, radius.data));
});
routesHandlers.post('/:id/confirm-places', async (c) => {
    let body: unknown;
    try { body = await c.req.json(); }
    catch { return c.json({error: {code: 'INVALID_JSON', message: 'Request body must be valid JSON'}}, 400); }
    const parsed = confirmRoutePlacesSchema.safeParse(body);
    if (!parsed.success) return c.json({error: {code: 'INVALID_CONFIRMATION', message: 'Selecciona entre 1 y 100 lugares distintos.'}}, 400);
    const database = createDatabase(c.env.DATABASE_URL);
    const userId = c.get('userId');
    const id = c.req.param('id');
    const route = await getRouteSummary(database, userId, id);
    if (!route) return c.json(missing, 404);
    const nearby = await nearbyRoutePlaces(database, userId, id);
    const allowed = new Set(nearby.map((item) => item.place.id));
    if (parsed.data.placeIds.some((placeId) => !allowed.has(placeId))) {
        return c.json({error: {code: 'PLACE_NOT_ON_ROUTE', message: 'Solo puedes confirmar lugares detectados a 100 m de esta ruta.'}}, 400);
    }
    return c.json(await confirmVisitedPlaces(database, userId, parsed.data.placeIds,
        parsed.data.useActivityDate ? route.activityDate : null));
});
