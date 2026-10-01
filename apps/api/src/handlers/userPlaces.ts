import {Hono} from 'hono';
import {
    createDatabase,
    developmentUserId,
    listUserPlaces,
    getUserPlace,
    upsertUserPlace,
    deleteUserPlace
} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';
import {placeIdSchema, updateUserPlaceSchema} from '../validation/userPlaces.js';

export const userPlacesRoutes = new Hono<ApiEnvironment>();

userPlacesRoutes.use('/:placeId', async (context, next) => {
    if (!placeIdSchema.safeParse(context.req.param('placeId')).success) {
        return context.json({error: {code: 'INVALID_PLACE_ID', message: 'Place ID must be a UUID'}}, 400);
    }
    await next();
});

userPlacesRoutes.get('/', async (context) => {
    return context.json(await listUserPlaces(createDatabase(context.env.DATABASE_URL), developmentUserId));
});

userPlacesRoutes.get('/:placeId', async (context) => {
    const state = await getUserPlace(createDatabase(context.env.DATABASE_URL), developmentUserId, context.req.param('placeId'));
    if (state === undefined) {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    return context.json(state);
});

userPlacesRoutes.put('/:placeId', async (context) => {
    let body: unknown;
    try {
        body = await context.req.json();
    } catch {
        return context.json({error: {code: 'INVALID_JSON', message: 'Request body must be valid JSON'}}, 400);
    }
    const parsed = updateUserPlaceSchema.safeParse(body);
    if (!parsed.success) {
        return context.json({
            error: {
                code: 'INVALID_USER_PLACE',
                message: 'Invalid personal place data',
                issues: parsed.error.issues
            }
        }, 400);
    }
    const result = await upsertUserPlace(createDatabase(context.env.DATABASE_URL), developmentUserId,
        context.req.param('placeId'), parsed.data);
    if (result.kind === 'not-found') {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    if (result.kind === 'invalid-date') {
        return context.json({
            error: {
                code: 'INVALID_VISIT_DATE',
                message: 'A visit date requires visited status'
            }
        }, 400);
    }
    return context.json(result.value);
});

userPlacesRoutes.delete('/:placeId', async (context) => {
    const exists = await deleteUserPlace(createDatabase(context.env.DATABASE_URL), developmentUserId, context.req.param('placeId'));
    if (!exists) {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    return context.body(null, 204);
});
