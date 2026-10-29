import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {NearbyRoutePlace, RouteDetail, RouteSummary} from '@relieve/shared';
import {useRoutes} from '../../src/routes/useRoutes';

const id = '00000000-0000-4000-8000-000000000001';
const placeId = '00000000-0000-4000-8000-000000000002';
const summary: RouteSummary = {
    id, name: 'Aneto', activityDate: '2026-08-12', distanceMeters: 1000,
    elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: null, maxElevationMeters: null,
    startedAt: null, endedAt: null, durationSeconds: null,
    createdAt: '2026-08-12T08:00:00.000Z', updatedAt: '2026-08-12T08:00:00.000Z',
};
const detail: RouteDetail = {...summary, geometry: {type: 'MultiLineString', coordinates: [[[0, 42], [0.1, 42.1]]]}};
const nearby: NearbyRoutePlace[] = [{place: {id: placeId, name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: 3404, latitude: 42.6, longitude: 0.6, description: null}, distanceFromRoute: 10, userState: null}];

describe('useRoutes', () => {
    it('loads routes, fetches selected details, confirms places and removes a route', async () => {
        let deleted = false;
        let confirmAttempts = 0;
        let deleteAttempts = 0;
        const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === '/api/routes' && init?.method !== 'DELETE') return Response.json(deleted ? [] : [summary]);
            if (url === `/api/routes/${id}/nearby-places`) return Response.json(nearby);
            if (url === `/api/routes/${id}/confirm-places`) return Response.json(++confirmAttempts === 1 ? [{}] : [
                {placeId, status: 'visited', favorite: false, visitedAt: null, notes: null},
            ]);
            if (url === `/api/routes/${id}` && init?.method === 'DELETE') {
                if (++deleteAttempts === 1) return new Response('', {status: 500});
                deleted = true;
                return new Response(null, {status: 204});
            }
            return Response.json(detail);
        });
        vi.stubGlobal('fetch', fetch);
        const visitsChanged = vi.fn();
        const {result} = renderHook(() => useRoutes(visitsChanged));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.routes).toEqual([summary]);

        act(() => result.current.select(id));
        await waitFor(() => expect(result.current.detail?.id).toBe(id));
        expect(result.current.nearby).toEqual(nearby);
        let confirmed = false;
        await act(async () => { confirmed = await result.current.confirm([placeId], true); });
        expect(confirmed).toBe(false);
        expect(result.current.message).toContain('No se han podido confirmar');
        await act(async () => { confirmed = await result.current.confirm([placeId], true); });
        expect(confirmed).toBe(true);
        expect(visitsChanged).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenNthCalledWith(4, `/api/routes/${id}/confirm-places`, expect.objectContaining({
            method: 'POST', body: JSON.stringify({placeIds: [placeId], useActivityDate: true}),
        }));

        await act(async () => result.current.remove());
        expect(result.current.message).toContain('No se ha podido eliminar');
        await act(async () => result.current.remove());
        expect(fetch.mock.calls.some(([input, init]) => input === `/api/routes/${id}` && init?.method === 'DELETE')).toBe(true);
        expect(result.current.selectedId).toBeNull();
        await waitFor(() => expect(result.current.routes).toEqual([]));
    });

    it('rejects invalid upload files and reports list failures with a working retry', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(new Response('', {status: 500})).mockResolvedValueOnce(Response.json([]));
        vi.stubGlobal('fetch', fetch);
        const {result} = renderHook(() => useRoutes(vi.fn()));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.message).toContain('No se han podido cargar las rutas');
        await act(async () => result.current.retry());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.message).toBe('');
        await act(async () => result.current.upload(new File(['x'], 'track.txt'), ''));
        expect(result.current.message).toContain('Selecciona un GPX');
        // Oversized files are rejected using their File.size before an upload starts.
        const tooLarge = {name: 'large.gpx', size: 5 * 1024 * 1024 + 1} as File;
        await act(async () => result.current.upload(tooLarge, ''));
        expect(result.current.message).toContain('Selecciona un GPX');
        await expect(result.current.confirm([], false)).resolves.toBe(false);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('uploads a GPX with progress and handles an unauthorized upload response', async () => {
        const fetch = vi.fn(async (input: RequestInfo | URL) => String(input) === '/api/routes'
            ? Response.json([summary]) : String(input).endsWith('/nearby-places') ? Response.json(nearby) : Response.json(detail));
        vi.stubGlobal('fetch', fetch);
        const requests: TestXhr[] = [];
        class TestXhr {
            static nextStatus = 201;
            static nextResponse: unknown = detail;
            upload: {onprogress: ((event: ProgressEvent) => void) | null} = {onprogress: null};
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            ontimeout: (() => void) | null = null;
            onabort: (() => void) | null = null;
            responseType = '';
            timeout = 0;
            status = 201;
            response: unknown = detail;
            body: FormData | null = null;
            open = vi.fn();
            constructor() { this.status = TestXhr.nextStatus; this.response = TestXhr.nextResponse; requests.push(this); }
            send(body: FormData) {
                this.body = body;
                this.upload.onprogress?.({lengthComputable: true, loaded: 5, total: 10} as ProgressEvent);
                this.onload?.();
            }
        }
        vi.stubGlobal('XMLHttpRequest', TestXhr);
        const expired = vi.fn();
        window.addEventListener('relieve-session-expired', expired);
        const {result} = renderHook(() => useRoutes(vi.fn()));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => result.current.upload(new File(['<gpx/>'], 'track.gpx'), '  Ruta  '));
        expect(requests[0]?.open).toHaveBeenCalledWith('POST', '/api/routes');
        expect(requests[0]?.timeout).toBe(120000);
        expect(requests[0]?.body?.get('name')).toBe('Ruta');
        await waitFor(() => expect(result.current.selectedId).toBe(id));

        TestXhr.nextStatus = 401;
        TestXhr.nextResponse = {error: {message: 'Session expired'}};
        await act(async () => result.current.upload(new File(['<gpx/>'], 'again.gpx'), ''));
        expect(expired).toHaveBeenCalledOnce();
        expect(result.current.message).toBe('Session expired');
        window.removeEventListener('relieve-session-expired', expired);
    });
});
