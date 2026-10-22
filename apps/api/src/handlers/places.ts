import {Hono} from 'hono';
import {createDatabase, getPlaceForUser, listPlacesForUser, regionExists, updateCatalogPlace} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';
import {placeIdSchema} from '../validation/userPlaces.js';
import {placeFiltersSchema, updateCatalogPlaceSchema} from '../validation/places.js';

export const placesRoutes = new Hono<ApiEnvironment>();

placesRoutes.get('/', async (context) => {
    const parsed = placeFiltersSchema.safeParse(context.req.query());
    if (!parsed.success) {
        return context.json({
            error: {
                code: 'INVALID_PLACE_FILTERS',
                message: 'Invalid place filters',
                issues: parsed.error.issues
            }
        }, 400);
    }
    const places = await listPlacesForUser(createDatabase(context.env.DATABASE_URL), context.get('userId'),
        parsed.data);
    return context.json(places);
});

placesRoutes.get('/:id', async (context) => {
    const parsed = placeIdSchema.safeParse(context.req.param('id'));
    if (!parsed.success) {
        return context.json({error: {code: 'INVALID_PLACE_ID', message: 'Place ID must be a UUID'}}, 400);
    }
    const place = await getPlaceForUser(createDatabase(context.env.DATABASE_URL), context.get('userId'),
        parsed.data);
    if (!place) {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    return context.json(place);
});

placesRoutes.put('/:id', async (context) => {
    if (!context.get('canEditCatalog')) {
        return context.json({error: {code: 'CATALOG_EDITOR_REQUIRED', message: 'Catalog editor access is required'}}, 403);
    }
    const parsedId = placeIdSchema.safeParse(context.req.param('id'));
    if (!parsedId.success) {
        return context.json({error: {code: 'INVALID_PLACE_ID', message: 'Place ID must be a UUID'}}, 400);
    }
    let body: unknown;
    try { body = await context.req.json(); }
    catch { return context.json({error: {code: 'INVALID_JSON', message: 'Request body must be valid JSON'}}, 400); }
    const parsed = updateCatalogPlaceSchema.safeParse(body);
    if (!parsed.success) {
        return context.json({error: {code: 'INVALID_CATALOG_PLACE', message: 'Invalid catalog place data',
            issues: parsed.error.issues}}, 400);
    }
    const database = createDatabase(context.env.DATABASE_URL);
    if (parsed.data.regionId && !await regionExists(database, parsed.data.regionId)) {
        return context.json({error: {code: 'INVALID_REGION', message: 'Region not found'}}, 400);
    }
    const updated = await updateCatalogPlace(database, parsedId.data, parsed.data);
    if (!updated) return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    const place = await getPlaceForUser(database, context.get('userId'), parsedId.data);
    return context.json(place);
});
