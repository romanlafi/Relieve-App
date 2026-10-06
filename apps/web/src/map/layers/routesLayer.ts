import type {LineLayerSpecification} from 'maplibre-gl';
import {mapColors} from '../../styles/theme.css';
export const routesSourceId = 'selected-route';
export const routesLayerId = 'selected-route-line';
export const routesLayer: LineLayerSpecification = {
    id: routesLayerId, type: 'line', source: routesSourceId,
    layout: {'line-cap': 'round', 'line-join': 'round'},
    paint: {'line-color': mapColors.route, 'line-width': 4, 'line-opacity': 0.95},
};
