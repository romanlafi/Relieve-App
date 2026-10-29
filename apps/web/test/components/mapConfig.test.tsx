import {describe, expect, it, vi} from 'vitest';
import type {Map} from 'maplibre-gl';
import {configureBasemapImages, configurePlaceIcons, hillshadeLayer, mapConfig, terrainSource} from '../../src/map/mapConfig';
import {placesFavoritesLayer, placesIconsLayer, placesLayer} from '../../src/map/layers/placesLayer';
import {routesLayer} from '../../src/map/layers/routesLayer';

function canvasContext() {
    return {
        scale: vi.fn(), translate: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
        fillRect: vi.fn(), getImageData: vi.fn(() => ({data: new Uint8ClampedArray(4), width: 1, height: 1})),
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '',
    };
}

describe('map configuration', () => {
    it('keeps the terrain style and place symbol filters consistent', () => {
        expect(mapConfig.zoom).toBe(9);
        expect(terrainSource.encoding).toBe('terrarium');
        expect(hillshadeLayer.type).toBe('hillshade');
        expect(placesLayer.paint?.['circle-opacity']).toEqual(['case', ['==', ['get', 'status'], 'pending'], 0.15, 1]);
        expect(placesIconsLayer.layout?.['icon-allow-overlap']).toBe(true);
        expect(placesFavoritesLayer.filter).toEqual(['==', ['get', 'favorite'], true]);
        expect(routesLayer.paint?.['line-width']).toBe(4);
    });

    it('registers missing place icons and skips existing or unsupported map images', () => {
        const context = canvasContext();
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
            const element = originalCreateElement(tagName, options);
            if (tagName === 'canvas') Object.defineProperty(element, 'getContext', {configurable: true, value: () => context});
            return element;
        }) as typeof document.createElement);
        vi.stubGlobal('Path2D', class { constructor(public path: string) {} });
        const images = new Set(['place-peak']);
        let resolveMissing: ((id: string) => void) | undefined;
        const map = {
            hasImage: vi.fn((id: string) => images.has(id)),
            addImage: vi.fn((id: string) => { images.add(id); }),
            setMissingStyleImageResolver: vi.fn((resolver: (id: string) => void) => { resolveMissing = resolver; }),
        } as unknown as Map;

        configurePlaceIcons(map);
        expect(map.addImage).toHaveBeenCalledTimes(6);
        expect(map.addImage).toHaveBeenCalledWith('place-favorite', expect.anything(), {pixelRatio: 2});
        expect(context.stroke).toHaveBeenCalled();
        configureBasemapImages(map);
        expect(resolveMissing).toBeTypeOf('function');
        resolveMissing?.('unsupported-image');
        resolveMissing?.('place-peak');
        expect(map.addImage).toHaveBeenCalledTimes(6);
        resolveMissing?.('circle-11');
        resolveMissing?.('wood-pattern');
        expect(map.addImage).toHaveBeenCalledTimes(8);
        expect(context.fillRect).toHaveBeenCalled();
    });

    it('skips icon canvases when the browser cannot provide a 2D context', () => {
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
            const element = originalCreateElement(tagName, options);
            if (tagName === 'canvas') Object.defineProperty(element, 'getContext', {configurable: true, value: () => null});
            return element;
        }) as typeof document.createElement);
        const map = {hasImage: () => false, addImage: vi.fn()} as unknown as Map;
        configurePlaceIcons(map);
        expect(map.addImage).not.toHaveBeenCalled();
    });
});
