import type {FeatureCollection, Point} from 'geojson';
import type {Place, PlaceStatus, PlaceWithUserState} from '@relieve/shared';

export type PlacesGeoJson = FeatureCollection<Point, Pick<Place, 'id' | 'name' | 'type' | 'elevation'> & {
    status: PlaceStatus | 'unregistered'; favorite: boolean;
}>;

export const visiblePlaceTypes = ['peak', 'lake', 'hut'] as const;
export type VisiblePlaceType = typeof visiblePlaceTypes[number];

export function placesToGeoJson(places: readonly PlaceWithUserState[]): PlacesGeoJson {
    return {
        type: 'FeatureCollection',
        features: places.filter((place) => visiblePlaceTypes.some((type) => type === place.type)).map((place) => ({
            type: 'Feature',
            id: place.id,
            geometry: {type: 'Point', coordinates: [place.longitude, place.latitude]},
            properties: {
                id: place.id, name: place.name, type: place.type, elevation: place.elevation,
                status: place.userState?.status ?? 'unregistered', favorite: place.userState?.favorite ?? false,
            },
        })),
    };
}
