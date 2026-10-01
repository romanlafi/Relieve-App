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
        'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 10, 7],
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 2],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false],
            mapColors.text, mapColors.background],
        'circle-pitch-alignment': 'viewport',
        'circle-pitch-scale': 'viewport',
    },
};
