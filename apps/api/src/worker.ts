import app from './index.js';
import type {ApiEnvironment} from './environment.js';

export default {
    fetch(request: Request, environment: ApiEnvironment['Bindings']) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/')) {
            url.pathname = url.pathname.slice(4);
            request = new Request(url, request);
        }
        return app.fetch(request, environment);
    },
};
