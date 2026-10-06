import type {Place, UserPlaceState} from './place.js';

export interface RouteGeometry { type: 'MultiLineString'; coordinates: number[][][] }
export interface RouteSummary {
    id: string;
    name: string;
    activityDate: string | null;
    distanceMeters: number;
    elevationGainMeters: number | null;
    elevationLossMeters: number | null;
    minElevationMeters: number | null;
    maxElevationMeters: number | null;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    createdAt: string;
    updatedAt: string;
}
export interface RouteDetail extends RouteSummary { geometry: RouteGeometry }
export interface RouteImport {
    name: string;
    activityDate: string | null;
    geometry: RouteGeometry;
    elevationSamples: (number | null)[][] | null;
    elevationGainMeters: number | null;
    elevationLossMeters: number | null;
    minElevationMeters: number | null;
    maxElevationMeters: number | null;
    startedAt: string | null;
    endedAt: string | null;
}
export interface NearbyRoutePlace {
    place: Place;
    distanceFromRoute: number;
    userState: UserPlaceState | null;
}
