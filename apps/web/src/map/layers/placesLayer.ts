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
        'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 10,
            ['==', ['get', 'status'], 'visited'], 8, 7],
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
