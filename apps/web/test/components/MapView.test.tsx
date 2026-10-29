import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {AuthState} from '../../src/auth/authContext';
import type {PlaceWithUserState} from '@relieve/shared';
import {AuthContext} from '../../src/auth/authContext';

const mocks = vi.hoisted(() => ({
    focusPlace: vi.fn(), usePlaces: vi.fn(), useRoutes: vi.fn(), useRegions: vi.fn(), useCatalogAccess: vi.fn(),
}));
vi.mock('../../src/map/usePlacesMap', () => ({usePlacesMap: () => ({
    status: 'ready', terrainUnavailable: true, focusPlace: mocks.focusPlace,
})}));
vi.mock('../../src/map/usePlaces', () => ({usePlaces: mocks.usePlaces}));
vi.mock('../../src/routes/useRoutes', () => ({useRoutes: mocks.useRoutes}));
vi.mock('../../src/map/useRegions', () => ({useRegions: mocks.useRegions}));
vi.mock('../../src/map/useCatalogAccess', () => ({useCatalogAccess: mocks.useCatalogAccess}));

const {MapView} = await import('../../src/map/MapView');
const place: PlaceWithUserState = {
    id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: null, latitude: 42.6, longitude: 0.6, description: 'Cima principal',
    regionId: '00000000-0000-4000-8000-000000000002', userState: null,
};
const auth: AuthState = {authenticated: false, authAvailable: true, canEditCatalog: false, user: null,
    status: 'ready', dialog: null, refresh: vi.fn().mockResolvedValue({authenticated: false, authAvailable: true,
        canEditCatalog: false, user: null}), open: vi.fn(), close: vi.fn()};

function renderMap() {
    return render(<AuthContext.Provider value={auth}><MapView/></AuthContext.Provider>);
}

describe('MapView', () => {
    beforeEach(() => {
        mocks.focusPlace.mockClear();
        mocks.usePlaces.mockReturnValue({state: {status: 'success', places: [place], query: 'region=pirineo-aragones'},
            retry: vi.fn(), personalSave: null, saveUserPlace: vi.fn(), mutationVersion: 0, visitsChanged: vi.fn()});
        mocks.useRoutes.mockReturnValue({detail: null, selectedId: null, routes: [], nearby: [], loading: false,
            loadingDetail: false, busy: false, progress: null, message: '', select: vi.fn(), upload: vi.fn(),
            remove: vi.fn(), confirm: vi.fn().mockResolvedValue(true), retry: vi.fn()});
        mocks.useRegions.mockReturnValue({regions: [], status: 'error', retry: vi.fn()});
        mocks.useCatalogAccess.mockReturnValue({canEditCatalog: false, publicReadOnly: true,
            authenticated: false, authAvailable: true});
    });

    it('presents the public map, selects a place and shows read-only account actions', () => {
        renderMap();
        expect(screen.getByText('1 lugar · selecciona un punto')).toBeTruthy();
        expect(screen.getByText('Relieve 3D no disponible. Puedes seguir explorando el mapa.')).toBeTruthy();
        fireEvent.focus(screen.getByLabelText('Buscar un lugar'));
        fireEvent.click(screen.getByRole('option', {name: /Aneto/}));
        expect(mocks.focusPlace).toHaveBeenCalledWith(place.longitude, place.latitude);
        expect(screen.getByLabelText('Lugar seleccionado')).toBeTruthy();
        expect(screen.getByText('Altitud no verificada')).toBeTruthy();
        expect(screen.getByText('No disponible')).toBeTruthy();
        expect(screen.getByText('Cima principal')).toBeTruthy();
        expect(screen.queryByLabelText('Estado personal')).toBeNull();
        expect(screen.getByRole('button', {name: 'Crear mi cuenta'})).toBeTruthy();
        expect(screen.queryByText('Mi progreso')).toBeNull();
    });

    it('closes selected places with Escape and can hide controls or switch to routes', () => {
        renderMap();
        fireEvent.focus(screen.getByLabelText('Buscar un lugar'));
        fireEvent.click(screen.getByRole('option', {name: /Aneto/}));
        fireEvent.keyDown(screen.getByLabelText('Explorar los Pirineos'), {key: 'Escape'});
        expect(screen.queryByLabelText('Lugar seleccionado')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Ocultar controles'}));
        fireEvent.click(screen.getByRole('button', {name: 'Mostrar controles'}));
        fireEvent.click(screen.getByRole('button', {name: /Mis rutas/}));
        expect(screen.getByText(/Inicia sesión para importar tus GPX/)).toBeTruthy();
    });

    it('shows personal editing and route tools for authenticated catalog editors', () => {
        mocks.useCatalogAccess.mockReturnValue({canEditCatalog: true, publicReadOnly: false,
            authenticated: true, authAvailable: true});
        renderMap();
        expect(screen.getByText('Mi progreso')).toBeTruthy();
        fireEvent.focus(screen.getByLabelText('Buscar un lugar'));
        fireEvent.click(screen.getByRole('option', {name: /Aneto/}));
        expect(screen.getByLabelText('Estado personal')).toBeTruthy();
        expect(screen.getByRole('heading', {name: 'Catálogo global'})).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: /Mis rutas/}));
        expect(screen.getByRole('heading', {name: 'Rutas'})).toBeTruthy();
    });
});
