import type {HillshadeLayerSpecification, Map, MapOptions, RasterDEMSourceSpecification} from 'maplibre-gl';
import {mapColors} from '../styles/theme.css';

export const mapConfig = {
    style: 'https://tiles.openfreemap.org/styles/dark',
    center: [0.35, 42.63],
    zoom: 9,
    pitch: 25,
    bearing: 0,
    maxPitch: 65,
    maxZoom: 17,
    attributionControl: {compact: true},
    locale: {
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
        'NavigationControl.ResetBearing': 'Restablecer orientación al norte',
        'AttributionControl.ToggleAttribution': 'Mostrar atribución',
    },
} satisfies Omit<MapOptions, 'container'>;

export const terrainSourceId = 'relieve-terrain';
export const hillshadeSourceId = 'relieve-hillshade-dem';
export const hillshadeLayerId = 'relieve-hillshade';
export const terrainSource: RasterDEMSourceSpecification = {
    type: 'raster-dem',
    url: 'https://tiles.mapterhorn.com/tilejson.json',
    tileSize: 512,
    encoding: 'terrarium',
    attribution: '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>',
};

export const hillshadeLayer: HillshadeLayerSpecification = {
    id: hillshadeLayerId,
    type: 'hillshade',
    source: hillshadeSourceId,
    paint: {
        'hillshade-exaggeration': 0.35,
        'hillshade-shadow-color': mapColors.terrainShadow,
        'hillshade-highlight-color': mapColors.terrain,
        'hillshade-accent-color': mapColors.terrainAccent,
    },
};

export function configureBasemapImages(map: Map) {
    map.setMissingStyleImageResolver((id) => {
        if (!['circle-11', 'wood-pattern'].includes(id) || map.hasImage(id)) return;
        const canvas = document.createElement('canvas');
        const size = id === 'circle-11' ? 11 : 8;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return;
        if (id === 'wood-pattern') {
            context.fillStyle = mapColors.terrainShadow;
            context.fillRect(0, 0, size, size);
        } else {
            context.fillStyle = mapColors.text;
            context.beginPath();
            context.arc(5.5, 5.5, 5, 0, Math.PI * 2);
            context.fill();
        }
        map.addImage(id, context.getImageData(0, 0, size, size));
    });
}
