import type {CircleLayerSpecification} from 'maplibre-gl';
import {mapColors, placeColors} from '../../styles/theme.css';

export const placesSourceId = 'relieve-places';
export const placesLayerId = 'relieve-places-points';

export const placesLayer: CircleLayerSpecification = {
    id: placesLayerId,
    type: 'circle',
    source: placesSourceId,
    paint: {
        'circle-color': ['match', ['get', 'type'],
            'peak', placeColors.peak, 'lake', placeColors.lake, 'hut', placeColors.hut, mapColors.text],
        'circle-radius': ['interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['feature-state', 'selected'], false], 6, ['==', ['get', 'status'], 'visited'], 4, 3],
            11, ['case', ['boolean', ['feature-state', 'selected'], false], 9, ['==', ['get', 'status'], 'visited'], 7, 6],
            15, ['case', ['boolean', ['feature-state', 'selected'], false], 11, ['==', ['get', 'status'], 'visited'], 9, 8]],
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
