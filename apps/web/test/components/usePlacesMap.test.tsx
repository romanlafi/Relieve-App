import {act, renderHook} from '@testing-library/react';
import {useRef} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {RouteDetail} from '@relieve/shared';
import type {PlacesGeoJson} from '../../src/map/placesGeoJson';

const mocks = vi.hoisted(() => ({instances: [] as FakeMap[], resizeObservers: [] as FakeResizeObserver[], failConstruction: false}));

class FakeBounds {
    coordinates: number[][] = [];
    extend(point: number[]) { this.coordinates.push(point); return this; }
    isEmpty() { return this.coordinates.length === 0; }
}

class FakeMap {
    handlers = new Map<string, (...args: never[]) => void>();
    sources = new Map<string, {setData: ReturnType<typeof vi.fn>}>();
    layers = new Set<string>();
    canvas = {style: {cursor: ''}};
    featureStates: unknown[] = [];
    fitBounds = vi.fn();
    addSource = vi.fn((id: string) => this.sources.set(id, {setData: vi.fn()}));
    addLayer = vi.fn((layer: {id: string}) => this.layers.add(layer.id));
    addControl = vi.fn();
    setTerrain = vi.fn();
    setFeatureState = vi.fn((state: unknown, value: unknown) => this.featureStates.push([state, value]));
    setLayoutProperty = vi.fn();
    getLayer = (id: string) => this.layers.has(id) ? {id} : undefined;
    getSource = (id: string) => this.sources.get(id);
    getStyle = () => ({layers: [{id: 'first-label', type: 'symbol'}]});
    getContainer = () => ({clientHeight: 800, clientWidth: 1000});
    getCanvas = () => this.canvas;
    getZoom = () => 8;
    flyTo = vi.fn();
    resize = vi.fn();
    remove = vi.fn();
    on(event: string, layerOrHandler: string | ((...args: never[]) => void), handler?: (...args: never[]) => void) {
        this.handlers.set(`${event}:${typeof layerOrHandler === 'string' ? layerOrHandler : ''}`, handler ?? layerOrHandler as (...args: never[]) => void);
        return this;
    }
    off = vi.fn();
    fire(event: string, layer: string, ...args: never[]) { this.handlers.get(`${event}:${layer}`)?.(...args); }
}

class FakeResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor() { mocks.resizeObservers.push(this); }
}

vi.mock('maplibre-gl', () => ({
    LngLatBounds: FakeBounds,
    Map: class extends FakeMap {
        constructor() {
            super();
            if (mocks.failConstruction) throw new Error('map failed');
            mocks.instances.push(this);
        }
    },
    NavigationControl: class {},
    setWorkerUrl: vi.fn(),
}));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({default: 'worker.js'}));
vi.mock('../../src/map/mapConfig', () => ({
    configureBasemapImages: vi.fn(), configurePlaceIcons: vi.fn(),
    hillshadeLayer: {id: 'hillshade'}, hillshadeLayerId: 'hillshade', hillshadeSourceId: 'hillshade-source',
    mapConfig: {zoom: 9}, terrainSource: {}, terrainSourceId: 'terrain-source',
}));
vi.mock('../../src/map/layers/routesLayer', () => ({routesLayer: {id: 'routes'}, routesSourceId: 'routes-source'}));
vi.mock('../../src/map/layers/placesLayer', () => ({
    placesFavoritesLayer: {id: 'favorites'}, placesFavoritesLayerId: 'favorites',
    placesIconsLayer: {id: 'icons'}, placesIconsLayerId: 'icons',
    placesLayer: {id: 'places'}, placesLayerId: 'places', placesSourceId: 'places-source',
}));

const {usePlacesMap} = await import('../../src/map/usePlacesMap');
const emptyData: PlacesGeoJson = {type: 'FeatureCollection', features: []};
const populatedData: PlacesGeoJson = {type: 'FeatureCollection', features: [{type: 'Feature', id: 'place-1',
    geometry: {type: 'Point', coordinates: [0.5, 42.5]}, properties: {id: 'place-1', name: 'Aneto', type: 'peak',
        elevation: 3404, status: 'unregistered', favorite: false}}]};
const route: RouteDetail = {id: 'route-1', name: 'Ruta', activityDate: null, distanceMeters: 10,
    elevationGainMeters: null, elevationLossMeters: null, minElevationMeters: null, maxElevationMeters: null,
    startedAt: null, endedAt: null, durationSeconds: null, createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z', geometry: {type: 'MultiLineString', coordinates: [[[0, 42], [1, 43]]]}};

describe('usePlacesMap', () => {
    afterEach(() => { mocks.instances.length = 0; mocks.resizeObservers.length = 0; mocks.failConstruction = false; });

    it('initializes map layers, frames places and handles route, selection, pointer and focus events', () => {
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        const onSelect = vi.fn();
        const {result, rerender, unmount} = renderHook(({data, selectedId, selectedRoute}: {
            data: PlacesGeoJson; selectedId: string | null; selectedRoute: RouteDetail | null;
        }) => {
            const container = useRef(document.createElement('div'));
            return usePlacesMap(container, data, selectedId, onSelect, 'region-1', selectedRoute);
        }, {initialProps: {data: populatedData, selectedId: null as string | null, selectedRoute: null as RouteDetail | null}});
        const map = mocks.instances[0]!;
        expect(result.current.status).toBe('loading');
        expect(mocks.resizeObservers[0]?.observe).toHaveBeenCalledOnce();

        act(() => map.fire('load', ''));
        expect(result.current.status).toBe('ready');
        expect(map.addSource).toHaveBeenCalledTimes(4);
        expect(map.fitBounds).toHaveBeenCalledOnce();
        act(() => map.fire('click', 'places', {features: [{id: 'place-1'}]} as never));
        act(() => map.fire('click', 'icons', {features: [{id: 7}]} as never));
        expect(onSelect).toHaveBeenCalledExactlyOnceWith('place-1');
        act(() => map.fire('mouseenter', 'places'));
        expect(map.getCanvas().style.cursor).toBe('pointer');
        act(() => map.fire('mouseleave', 'places'));
        expect(map.getCanvas().style.cursor).toBe('');

        rerender({data: {...populatedData}, selectedId: 'place-1', selectedRoute: route});
        expect(map.setFeatureState).toHaveBeenCalledWith({source: 'places-source', id: 'place-1'}, {selected: true});
        expect(map.getSource('places-source')?.setData).toHaveBeenCalledWith(populatedData);
        expect(map.getSource('routes-source')?.setData).toHaveBeenCalledWith({type: 'Feature', properties: {}, geometry: route.geometry});
        expect(map.fitBounds).toHaveBeenCalledTimes(2);
        act(() => result.current.focusPlace(0.5, 42.5));
        expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({center: [0.5, 42.5], zoom: 12, duration: 700}));

        rerender({data: emptyData, selectedId: null, selectedRoute: null});
        expect(map.setFeatureState).toHaveBeenCalledWith({source: 'places-source', id: 'place-1'}, {selected: false});
        expect(map.getSource('routes-source')?.setData).toHaveBeenLastCalledWith({type: 'FeatureCollection', features: []});
        unmount();
        expect(map.remove).toHaveBeenCalledOnce();
        expect(mocks.resizeObservers[0]?.disconnect).toHaveBeenCalledOnce();
    });

    it('reports terrain and map errors and tolerates map construction failure', async () => {
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        const onSelect = vi.fn();
        const {result, unmount} = renderHook(() => {
            const container = useRef(document.createElement('div'));
            return usePlacesMap(container, emptyData, null, onSelect, null, null);
        });
        const map = mocks.instances[0]!;
        act(() => map.fire('load', ''));
        expect(map.handlers.has('error:')).toBe(true);
        act(() => map.handlers.get('error:')?.({} as never));
        expect(result.current.status).toBe('error');
        unmount();

        mocks.failConstruction = true;
        const failed = renderHook(() => {
            const container = useRef(document.createElement('div'));
            return usePlacesMap(container, emptyData, null, onSelect, null, null);
        });
        await act(async () => { await Promise.resolve(); });
        expect(failed.result.current.status).toBe('error');
        failed.unmount();
    });
});
