import {Hono} from 'hono';
import {z} from 'zod';
import {createDatabase, getPlace, listPlaces} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';

export const placesRoutes = new Hono<ApiEnvironment>();

placesRoutes.get('/', async (context) => {
    const places = await listPlaces(createDatabase(context.env.DATABASE_URL));
    return context.json(places);
});

placesRoutes.get('/:id', async (context) => {
    const parsed = z.uuid().safeParse(context.req.param('id'));
    if (!parsed.success) {
        return context.json({error: {code: 'INVALID_PLACE_ID', message: 'Place ID must be a UUID'}}, 400);
    }
    const place = await getPlace(createDatabase(context.env.DATABASE_URL), parsed.data);
    if (!place) {
        return context.json({error: {code: 'PLACE_NOT_FOUND', message: 'Place not found'}}, 404);
    }
    return context.json(place);
});
