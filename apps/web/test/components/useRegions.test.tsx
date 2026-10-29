import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useRegions} from '../../src/map/useRegions';

const region = {id: '00000000-0000-4000-8000-000000000001', name: 'Benasque', slug: 'benasque', type: 'valley', parentId: null};

describe('useRegions', () => {
    it('loads validated region data', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([region])));
        const {result} = renderHook(() => useRegions());
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.regions).toEqual([region]);
    });

    it('exposes an error for invalid service responses and retries the request', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(Response.json([{...region, type: 'unknown'}]))
            .mockResolvedValueOnce(Response.json([region]));
        vi.stubGlobal('fetch', fetch);
        const {result} = renderHook(() => useRegions());
        await waitFor(() => expect(result.current.status).toBe('error'));
        await act(async () => result.current.retry());
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
