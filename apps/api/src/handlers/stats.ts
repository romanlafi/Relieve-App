import {Hono} from 'hono';
import {createDatabase, getPersonalStats} from '@relieve/database';
import type {ApiEnvironment} from '../environment.js';

export const statsRoutes = new Hono<ApiEnvironment>();
statsRoutes.get('/', async (context) => context.json(
    await getPersonalStats(createDatabase(context.env.DATABASE_URL), context.get('userId')),
));
