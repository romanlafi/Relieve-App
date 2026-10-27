import type {HillshadeLayerSpecification, Map, MapOptions, RasterDEMSourceSpecification} from 'maplibre-gl';
import {mapColors} from '../styles/theme.css';
import {iconPaths} from '../ui/iconPaths';

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

export function configurePlaceIcons(map: Map) {
    const size = 64;
    const icons = {'place-peak': iconPaths.peak, 'place-lake': iconPaths.lake,
        'place-hut': iconPaths.hut, 'place-favorite': iconPaths.star,
        'place-peak-pending': iconPaths.peak, 'place-lake-pending': iconPaths.lake, 'place-hut-pending': iconPaths.hut};

    for (const [id, path] of Object.entries(icons)) {
        if (map.hasImage(id)) continue;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) continue;
        context.scale(size / 24, size / 24);
        if (id === 'place-favorite') {
            context.beginPath();
            context.arc(12, 12, 11, 0, Math.PI * 2);
            context.fillStyle = mapColors.background;
            context.fill();
            context.lineWidth = 1;
            context.strokeStyle = mapColors.route;
            context.stroke();
        }
        context.translate(4, 4);
        context.scale(2 / 3, 2 / 3);
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = id === 'place-favorite' ? mapColors.route
            : id.endsWith('-pending') ? mapColors.text : mapColors.background;
        if (id === 'place-favorite') {
            context.fillStyle = mapColors.route;
            context.fill(new Path2D(path));
        }
        context.stroke(new Path2D(path));
        map.addImage(id, context.getImageData(0, 0, size, size), {pixelRatio: 2});
    }
}

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
