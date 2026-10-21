import type {CircleLayerSpecification, SymbolLayerSpecification} from 'maplibre-gl';
import {mapColors, placeColors} from '../../styles/theme.css';

export const placesSourceId = 'relieve-places';
export const placesLayerId = 'relieve-places-points';
export const placesIconsLayerId = 'relieve-places-icons';
export const placesFavoritesLayerId = 'relieve-places-favorites';

export const placesLayer: CircleLayerSpecification = {
    id: placesLayerId,
    type: 'circle',
    source: placesSourceId,
    paint: {
        'circle-color': ['match', ['get', 'type'],
            'peak', placeColors.peak, 'lake', placeColors.lake, 'hut', placeColors.hut, mapColors.text],
        'circle-radius': ['interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['feature-state', 'selected'], false], 10, ['==', ['get', 'status'], 'visited'], 9, 8],
            11, ['case', ['boolean', ['feature-state', 'selected'], false], 13, ['==', ['get', 'status'], 'visited'], 11, 10],
            15, ['case', ['boolean', ['feature-state', 'selected'], false], 15, ['==', ['get', 'status'], 'visited'], 13, 12]],
        'circle-opacity': ['case', ['==', ['get', 'status'], 'pending'], 0.15, 1],
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3,
            ['==', ['get', 'status'], 'visited'], 3, ['==', ['get', 'status'], 'pending'], 2, 1],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false],
            mapColors.text, ['==', ['get', 'status'], 'visited'], mapColors.text,
            ['==', ['get', 'status'], 'pending'], ['match', ['get', 'type'],
                'peak', placeColors.peak, 'lake', placeColors.lake, 'hut', placeColors.hut, mapColors.text],
            mapColors.background],
        'circle-pitch-alignment': 'viewport',
        'circle-pitch-scale': 'viewport',
    },
};

export const placesIconsLayer: SymbolLayerSpecification = {
    id: placesIconsLayerId,
    type: 'symbol',
    source: placesSourceId,
    layout: {
        'icon-image': ['match', ['get', 'type'],
            'peak', 'place-peak', 'lake', 'place-lake', 'hut', 'place-hut', 'place-peak'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.55, 11, 0.7, 15, 0.8],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'center',
        'icon-pitch-alignment': 'viewport',
        'icon-rotation-alignment': 'viewport',
    },
    paint: {
        'icon-opacity': ['case', ['==', ['get', 'status'], 'pending'], 0.55, 1],
    },
};

export const placesFavoritesLayer: SymbolLayerSpecification = {
    id: placesFavoritesLayerId,
    type: 'symbol',
    source: placesSourceId,
    filter: ['==', ['get', 'favorite'], true],
    layout: {
        'icon-image': 'place-favorite',
        'icon-size': 0.42,
        'icon-offset': [17, -17],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'center',
    },
    paint: {
        'icon-halo-color': mapColors.background,
        'icon-halo-width': 1.5,
    },
};
