import type {HillshadeLayerSpecification, Map, MapOptions, RasterDEMSourceSpecification} from 'maplibre-gl';
import {mapColors, placeColors} from '../styles/theme.css';

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
    const icons: Record<string, (context: CanvasRenderingContext2D) => void> = {
        'place-peak': (context) => {
            context.beginPath();
            context.moveTo(9, 48);
            context.lineTo(27, 20);
            context.lineTo(36, 33);
            context.lineTo(43, 24);
            context.lineTo(57, 48);
            context.closePath();
            context.fill();
            context.fillStyle = mapColors.text;
            context.beginPath();
            context.moveTo(22, 28);
            context.lineTo(27, 20);
            context.lineTo(33, 29);
            context.lineTo(29, 27);
            context.lineTo(26, 31);
            context.closePath();
            context.fill();
        },
        'place-lake': (context) => {
            context.lineWidth = 5;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(10, 25);
            context.bezierCurveTo(17, 19, 23, 31, 30, 25);
            context.bezierCurveTo(37, 19, 43, 31, 54, 24);
            context.moveTo(10, 39);
            context.bezierCurveTo(17, 33, 23, 45, 30, 39);
            context.bezierCurveTo(37, 33, 43, 45, 54, 38);
            context.stroke();
        },
        'place-hut': (context) => {
            context.beginPath();
            context.moveTo(9, 31);
            context.lineTo(32, 12);
            context.lineTo(55, 31);
            context.lineTo(49, 31);
            context.lineTo(49, 50);
            context.lineTo(15, 50);
            context.lineTo(15, 31);
            context.closePath();
            context.fill();
            context.fillStyle = placeColors.hut;
            context.fillRect(28, 36, 9, 14);
        },
        'place-favorite': (context) => {
            context.fillStyle = mapColors.route;
            context.beginPath();
            for (let point = 0; point < 10; point += 1) {
                const angle = -Math.PI / 2 + point * Math.PI / 5;
                const radius = point % 2 === 0 ? 25 : 11;
                const x = 32 + Math.cos(angle) * radius;
                const y = 32 + Math.sin(angle) * radius;
                if (point === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.closePath();
            context.fill();
        },
    };

    for (const [id, draw] of Object.entries(icons)) {
        if (map.hasImage(id)) continue;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) continue;
        context.fillStyle = mapColors.background;
        context.strokeStyle = mapColors.background;
        draw(context);
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
