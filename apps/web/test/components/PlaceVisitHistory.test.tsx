import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {PlaceVisitHistory} from '../../src/map/PlaceVisitHistory';

const placeId = '00000000-0000-4000-8000-000000000001';
const older = {id: '00000000-0000-4000-8000-000000000002', placeId, visitedAt: '2025-06-01'};
const newer = {id: '00000000-0000-4000-8000-000000000003', placeId, visitedAt: '2026-08-12'};

describe('PlaceVisitHistory', () => {
    it('loads visits, adds a date in sorted order, then removes a visit', async () => {
        const fetch = vi.fn()
            .mockResolvedValueOnce(Response.json([older]))
            .mockResolvedValueOnce(Response.json(newer))
            .mockResolvedValueOnce(new Response(null, {status: 204}));
        vi.stubGlobal('fetch', fetch);
        const onChanged = vi.fn();
        render(<PlaceVisitHistory placeId={placeId} onChanged={onChanged}/>);
        expect(await screen.findByRole('button', {name: 'Eliminar visita del 2025-06-01'})).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Añadir fecha'), {target: {value: newer.visitedAt}});
        fireEvent.click(screen.getByRole('button', {name: 'Añadir visita'}));
        await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
        expect(fetch).toHaveBeenNthCalledWith(2, `/api/user/places/${placeId}/visits`, expect.objectContaining({
            method: 'POST', body: JSON.stringify({visitedAt: newer.visitedAt}),
        }));
        const items = screen.getAllByRole('listitem');
        expect(items[0]?.textContent).toContain('2026');
        expect(items[1]?.textContent).toContain('2025');

        fireEvent.click(screen.getByRole('button', {name: `Eliminar visita del ${newer.visitedAt}`}));
        await waitFor(() => expect(screen.queryByRole('button', {name: `Eliminar visita del ${newer.visitedAt}`})).toBeNull());
        expect(fetch).toHaveBeenNthCalledWith(3, `/api/user/places/${placeId}/visits/${newer.id}`, expect.objectContaining({method: 'DELETE'}));
        expect(onChanged).toHaveBeenCalledTimes(2);
    });

    it('offers retry after a failed load and reports a failed mutation', async () => {
        const fetch = vi.fn()
            .mockResolvedValueOnce(new Response('', {status: 500}))
            .mockResolvedValueOnce(Response.json([]))
            .mockResolvedValueOnce(new Response('', {status: 500}));
        vi.stubGlobal('fetch', fetch);
        render(<PlaceVisitHistory placeId={placeId} onChanged={vi.fn()}/>);
        fireEvent.click(await screen.findByRole('button', {name: 'Reintentar'}));
        expect(await screen.findByText('Aún no hay visitas con fecha.')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Añadir fecha'), {target: {value: '2026-01-01'}});
        fireEvent.click(screen.getByRole('button', {name: 'Añadir visita'}));
        expect(await screen.findByRole('alert')).toBeTruthy();
    });
});
