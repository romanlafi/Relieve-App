import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {PlaceWithUserState} from '@relieve/shared';
import {usePlaces} from '../../src/map/usePlaces';

const place: PlaceWithUserState = {
    id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: 3404, latitude: 42.6, longitude: 0.6, description: null, regionId: null, userState: null,
};

describe('usePlaces', () => {
    it('loads catalog entries and saves personal state while applying active filters', async () => {
        const saved = {placeId: place.id, status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: null};
        const fetch = vi.fn().mockResolvedValueOnce(Response.json([place]))
            .mockResolvedValueOnce(Response.json(saved)).mockResolvedValue(Response.json([{...place, userState: saved}]));
        vi.stubGlobal('fetch', fetch);
        const {result} = renderHook(() => usePlaces({favorite: true}));
        await waitFor(() => expect(result.current.state.status).toBe('success'));
        if (result.current.state.status !== 'success') throw new Error('Expected loaded places');
        expect(result.current.state.places).toEqual([place]);
        expect(fetch).toHaveBeenNthCalledWith(1, '/api/places?favorite=true', expect.objectContaining({credentials: 'same-origin'}));

        let value;
        await act(async () => { value = await result.current.saveUserPlace(place.id, {status: 'visited', favorite: true}); });
        expect(value).toEqual({status: 'visited', favorite: true, visitedAt: '2026-08-12', notes: null});
        expect(result.current.personalSave).toEqual({placeId: place.id, status: 'saved'});
        expect(fetch).toHaveBeenNthCalledWith(2, `/api/user/places/${place.id}`, expect.objectContaining({
            method: 'PUT', body: JSON.stringify({status: 'visited', favorite: true}),
        }));
        expect(fetch).toHaveBeenCalledTimes(3);
        await waitFor(() => expect(result.current.state.status).toBe('success'));
    });

    it('reports invalid API data, retries failed loads and keeps state after a failed mutation', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(Response.json([{...place, latitude: 91}]))
            .mockResolvedValueOnce(Response.json([place]))
            .mockResolvedValueOnce(new Response('', {status: 500}));
        vi.stubGlobal('fetch', fetch);
        const {result} = renderHook(() => usePlaces({}));
        await waitFor(() => expect(result.current.state.status).toBe('error'));
        if (result.current.state.status !== 'error') throw new Error('Expected invalid API response');
        expect(result.current.state.message).toContain('datos de lugares no válidos');

        await act(async () => result.current.retry());
        await waitFor(() => expect(result.current.state.status).toBe('success'));
        let saved;
        await act(async () => { saved = await result.current.saveUserPlace(place.id, null); });
        expect(saved).toBeUndefined();
        expect(result.current.personalSave).toEqual({placeId: place.id, status: 'error'});
        expect(result.current.state.status).toBe('success');
    });
});
