import type {FeatureCollection, Point} from 'geojson';
import type {Place} from '@relieve/shared';

export type PlacesGeoJson = FeatureCollection<Point, Pick<Place, 'id' | 'name' | 'type' | 'elevation'>>;

export const visiblePlaceTypes = ['peak', 'lake', 'hut'] as const;
export type VisiblePlaceType = typeof visiblePlaceTypes[number];

export function placesToGeoJson(places: readonly Place[]): PlacesGeoJson {
    return {
        type: 'FeatureCollection',
        features: places.filter((place) => visiblePlaceTypes.some((type) => type === place.type)).map((place) => ({
            type: 'Feature',
            id: place.id,
            geometry: {type: 'Point', coordinates: [place.longitude, place.latitude]},
            properties: {id: place.id, name: place.name, type: place.type, elevation: place.elevation},
        })),
    };
}
