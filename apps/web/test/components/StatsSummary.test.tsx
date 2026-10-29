import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {PersonalStats} from '@relieve/shared';
import {StatsSummary} from '../../src/map/StatsSummary';

const stats: PersonalStats = {
    total: 3, visited: 2, pending: 1, favorites: 1,
    threeThousands: {total: 1, visited: 1},
    byType: [{type: 'peak', total: 2, visited: 2}, {type: 'lake', total: 1, visited: 0}],
    byRegion: [{id: '00000000-0000-4000-8000-000000000001', name: 'Benasque', slug: 'benasque',
        type: 'valley', total: 3, visited: 2, pending: 1, favorites: 1}],
    byYear: [{year: 2025, visited: 1}, {year: 2026, visited: 2}],
    highestPeak: {id: '00000000-0000-4000-8000-000000000002', name: 'Aneto', elevation: 3404},
};

describe('StatsSummary', () => {
    it('renders summary statistics, regional progress, years and highest peak', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(stats)));
        render(<StatsSummary version={0}/>);
        expect((await screen.findAllByText('2 / 3')).length).toBe(2);
        expect(screen.getByText(/Pico más alto visitado: Aneto/).textContent).toMatch(/Aneto.*m/);
        fireEvent.click(screen.getByText('Progreso por región y macizo'));
        expect(screen.getByText(/Benasque · Valle/)).toBeTruthy();
        fireEvent.click(screen.getByText('Lugares visitados por año'));
        expect(screen.getByText('2025: 1 visita')).toBeTruthy();
        expect(screen.getByText('2026: 2 visitas')).toBeTruthy();
    });

    it('shows empty-state content, reports invalid data and retries a failed request', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(Response.json({...stats, total: -1}))
            .mockResolvedValueOnce(Response.json({...stats, byYear: [], highestPeak: null}));
        vi.stubGlobal('fetch', fetch);
        render(<StatsSummary version={1}/>);
        const retry = await screen.findByRole('button', {name: 'Reintentar'});
        fireEvent.click(retry);
        await waitFor(() => expect(screen.getByText('Todavía no has registrado un pico con altitud conocida como visitado.')).toBeTruthy());
        fireEvent.click(screen.getByText('Lugares visitados por año'));
        expect(screen.getByText('Aún no hay visitas con fecha registrada.')).toBeTruthy();
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
