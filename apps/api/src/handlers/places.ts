import {Hono} from 'hono';
import {createDatabase, developmentUserId, getPlaceForUser, listPlacesForUser} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';
import {placeIdSchema} from '../validation/userPlaces.js';
import {placeFiltersSchema} from '../validation/places.js';

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
    const places = await listPlacesForUser(createDatabase(context.env.DATABASE_URL), developmentUserId, parsed.data);
    return context.json(places);
});

placesRoutes.get('/:id', async (context) => {
    const parsed = placeIdSchema.safeParse(context.req.param('id'));
    if (!parsed.success) {
        return context.json({error: {code: 'INVALID_PLACE_ID', message: 'Place ID must be a UUID'}}, 400);
    }
    const place = await getPlaceForUser(createDatabase(context.env.DATABASE_URL), developmentUserId, parsed.data);
    if (!place) {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    return context.json(place);
});
