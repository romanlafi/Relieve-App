import {Hono} from 'hono';
import {createDatabase, listRegions} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';

export const regionsRoutes = new Hono<ApiEnvironment>();

regionsRoutes.get('/', async (context) => {
    return context.json(await listRegions(createDatabase(context.env.DATABASE_URL)));
});
