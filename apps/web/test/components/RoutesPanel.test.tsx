import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {NearbyRoutePlace, RouteDetail} from '@relieve/shared';
import type {useRoutes} from '../../src/routes/useRoutes';
import {RoutesPanel} from '../../src/routes/RoutesPanel';

const routeId = '00000000-0000-4000-8000-000000000001';
const placeId = '00000000-0000-4000-8000-000000000002';
const detail: RouteDetail = {
    id: routeId, name: 'Vuelta al Aneto', activityDate: '2026-08-12', distanceMeters: 12345,
    elevationGainMeters: 800, elevationLossMeters: 790, minElevationMeters: 2200, maxElevationMeters: 3404,
    startedAt: '2026-08-12T06:00:00.000Z', endedAt: '2026-08-12T12:00:00.000Z', durationSeconds: 21600,
    createdAt: '2026-08-12T12:01:00.000Z', updatedAt: '2026-08-12T12:01:00.000Z',
    geometry: {type: 'MultiLineString', coordinates: [[[0, 42], [0.1, 42.1]]]},
};
const nearby: NearbyRoutePlace[] = [
    {place: {id: placeId, name: 'Aneto', slug: 'aneto', type: 'peak', elevation: 3404, latitude: 42.6,
        longitude: 0.6, description: null}, distanceFromRoute: 12, userState: null},
    {place: {id: '00000000-0000-4000-8000-000000000003', name: 'Posets', slug: 'posets', type: 'peak', elevation: 3375,
        latitude: 42.6, longitude: 0.6, description: null}, distanceFromRoute: 60,
        userState: {status: 'visited', favorite: false, visitedAt: '2025-08-01', notes: null}},
];

function makeState(overrides: Record<string, unknown> = {}) {
    return {
        routes: [{...detail, geometry: undefined}], selectedId: null, detail: null, nearby: [], loading: false,
        loadingDetail: false, busy: false, progress: null, message: '', select: vi.fn(), upload: vi.fn(),
        remove: vi.fn(), confirm: vi.fn().mockResolvedValue(true), retry: vi.fn(), ...overrides,
    } as unknown as ReturnType<typeof useRoutes>;
}

describe('RoutesPanel', () => {
    it('requires a selected GPX file and uploads it with the optional name', () => {
        const state = makeState();
        render(<RoutesPanel state={state}/>);
        expect((screen.getByRole('button', {name: 'Importar GPX'})).hasAttribute('disabled')).toBe(true);
        const file = new File(['<gpx/>'], 'walk.gpx', {type: 'application/gpx+xml'});
        fireEvent.change(screen.getByLabelText('Importar un recorrido GPX'), {target: {files: [file]}});
        fireEvent.change(screen.getByLabelText('Nombre opcional'), {target: {value: 'Travesía'}});
        fireEvent.click(screen.getByRole('button', {name: 'Importar GPX'}));
        expect(state.upload).toHaveBeenCalledWith(file, 'Travesía');
    });

    it('confirms only selected route places and asks before deleting a route', async () => {
        const state = makeState({selectedId: routeId, detail, nearby, progress: 50, message: 'Subiendo: 50%'});
        render(<RoutesPanel state={state}/>);
        expect(screen.getAllByText('Subiendo: 50%').length).toBe(2);
        expect(screen.getByText(/12[,.]35 km/)).toBeTruthy();
        expect((document.getElementById(`route-place-${nearby[1]!.place.id}`) as HTMLInputElement).disabled).toBe(true);
        fireEvent.click(document.getElementById(`route-place-${placeId}`)!);
        fireEvent.click(screen.getByLabelText(/Usar 2026-08-12 como fecha/));
        fireEvent.click(screen.getByRole('button', {name: 'Marcar seleccionados como visitados'}));
        await waitFor(() => expect(state.confirm).toHaveBeenCalledWith([placeId], true));

        fireEvent.click(screen.getByRole('button', {name: 'Eliminar ruta'}));
        expect(screen.getByText(/¿Eliminar esta ruta\?/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Confirmar eliminación'}));
        expect(state.remove).toHaveBeenCalledOnce();
    });
});
