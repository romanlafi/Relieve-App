import {Hono} from 'hono';
import type {HealthResponse} from '@relieve/shared';

const app = new Hono();

app.get('/health', (c) => {
    const response: HealthResponse = {status: 'ok'};
    return c.json(response);
});

export default app;
