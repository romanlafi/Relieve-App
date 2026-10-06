import {SaxesParser} from 'saxes';
import {z} from 'zod';
import type {RouteImport} from '@relieve/shared';

export const MAX_GPX_BYTES = 5 * 1024 * 1024;
export const MAX_TRACK_POINTS = 50000;
export class GpxError extends Error {}
const pointSchema = z.object({
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    elevation: z.number().finite().min(-12000).max(10000).nullable(),
    time: z.iso.datetime({offset: true}).nullable(),
});
type Point = z.infer<typeof pointSchema>;
const namespaces = new Set(['', 'http://www.topografix.com/GPX/1/0', 'http://www.topografix.com/GPX/1/1']);

function number(text: string | undefined): number {
    if (!text?.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim())) return NaN;
    return Number(text);
}

export function parseGpx(xml: string, filename: string, overrideName?: string): RouteImport {
    if (!/\.gpx$/i.test(filename)) throw new GpxError('Selecciona un archivo .gpx.');
    if (new TextEncoder().encode(xml).length > MAX_GPX_BYTES) throw new GpxError('El GPX supera el límite de 5 MiB.');
    if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) throw new GpxError('No se permiten DTD ni entidades XML.');
    const parser = new SaxesParser({xmlns: true});
    const stack: string[] = [];
    const segments: Point[][] = [];
    let segment: Point[] | null = null;
    let point: Point | null = null;
    let text = '';
    let trackName = '';
    let count = 0;
    let rootNamespace = '';
    parser.on('error', () => { throw new GpxError('El archivo no contiene XML válido.'); });
    parser.on('doctype', () => { throw new GpxError('No se permiten DTD.'); });
    parser.on('opentag', (tag) => {
        if (stack.length === 0) {
            if (tag.local !== 'gpx' || !namespaces.has(tag.uri)) throw new GpxError('El documento debe ser GPX.');
            rootNamespace = tag.uri;
        }
        const local = tag.uri === rootNamespace ? tag.local : '!extension';
        stack.push(local);
        if (stack.length > 32) throw new GpxError('XML demasiado profundo.');
        text = '';
        const path = stack.join('/');
        if (path === 'gpx/trk/trkseg') segment = [];
        if (path === 'gpx/trk/trkseg/trkpt') {
            if (++count > MAX_TRACK_POINTS) throw new GpxError('El GPX supera los 50.000 puntos.');
            point = {longitude: number(tag.attributes.lon?.value), latitude: number(tag.attributes.lat?.value), elevation: null, time: null};
        }
    });
    const collectText = (value: string) => {
        const path = stack.join('/');
        if (['gpx/trk/name', 'gpx/trk/trkseg/trkpt/ele', 'gpx/trk/trkseg/trkpt/time'].includes(path)) {
            text += value;
            if (text.length > 512) throw new GpxError('Campo GPX demasiado largo.');
        }
    };
    parser.on('text', collectText);
    parser.on('cdata', collectText);
    parser.on('closetag', () => {
        const path = stack.join('/');
        if (path === 'gpx/trk/name' && !trackName) trackName = text.trim();
        if (path === 'gpx/trk/trkseg/trkpt/ele' && point) point.elevation = number(text);
        if (path === 'gpx/trk/trkseg/trkpt/time' && point) point.time = text.trim();
        if (path === 'gpx/trk/trkseg/trkpt' && point && segment) {
            const valid = pointSchema.safeParse(point);
            if (!valid.success) throw new GpxError('Coordenadas, elevaciones o fechas GPX no válidas.');
            segment.push(valid.data);
            point = null;
        }
        if (path === 'gpx/trk/trkseg' && segment) {
            if (segment.length < 2) throw new GpxError('Cada segmento debe contener al menos dos puntos.');
            if (!segment.some((p) => p.longitude !== segment![0]!.longitude || p.latitude !== segment![0]!.latitude)) {
                throw new GpxError('Cada segmento debe contener al menos dos coordenadas distintas.');
            }
            segments.push(segment);
            segment = null;
        }
        stack.pop();
        text = '';
    });
    parser.write(xml).close();
    if (!segments.length) throw new GpxError('El GPX no contiene un track con segmentos.');
    const name = overrideName?.trim() || trackName || filename.replace(/\.gpx$/i, '');
    if (!name || name.length > 200) throw new GpxError('El nombre debe tener entre 1 y 200 caracteres.');
    const all = segments.flat();
    const completeElevation = all.every((p) => p.elevation !== null);
    const elevations = all.flatMap((p) => p.elevation === null ? [] : [p.elevation]);
    let gain = 0;
    let loss = 0;
    if (completeElevation) {
        for (const points of segments) {
            let anchor = points[0]!.elevation!;
            for (const p of points.slice(1)) {
                const delta = p.elevation! - anchor;
                // Deadband: cumulative movement below 3 m is ignored, without altering the track.
                if (Math.abs(delta) >= 3) {
                    gain += Math.max(0, delta);
                    loss += Math.max(0, -delta);
                    anchor = p.elevation!;
                }
            }
        }
    }
    const completeTime = all.every((p) => p.time !== null);
    const chronological = completeTime && all.every((p, i) => i === 0 || Date.parse(p.time!) >= Date.parse(all[i - 1]!.time!));
    const startedAt = chronological ? new Date(all[0]!.time!).toISOString() : null;
    const endedAt = chronological ? new Date(all[all.length - 1]!.time!).toISOString() : null;
    return {
        name, activityDate: startedAt?.slice(0, 10) ?? null, startedAt, endedAt,
        geometry: {type: 'MultiLineString', coordinates: segments.map((points) => points.map((p) =>
            completeElevation ? [p.longitude, p.latitude, p.elevation!] : [p.longitude, p.latitude]))},
        elevationSamples: !completeElevation && elevations.length ? segments.map((points) => points.map((p) => p.elevation)) : null,
        elevationGainMeters: completeElevation ? gain : null,
        elevationLossMeters: completeElevation ? loss : null,
        minElevationMeters: elevations.length ? Math.min(...elevations) : null,
        maxElevationMeters: elevations.length ? Math.max(...elevations) : null,
    };
}
